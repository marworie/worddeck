// ============================================================
// Program.cs
// Uygulamanın başlangıç noktası: servisleri kaydeder (repository'ler, JWT, Swagger)
// ve gelen isteklerin geçeceği sırayı (middleware hattı) kurar.
// ============================================================

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using WordDeck.Middleware;
using WordDeck.Repositories;
using WordDeck.Services;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
// Swagger + "Authorize 🔒" butonu: token'ı bir kez yapıştırıp korumalı endpoint'leri test edebilmek için
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Login'den aldığın token'ı yapıştır"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Repository'ler: "biri IUserRepository isterse UserRepository ver"
builder.Services.AddScoped<IUserRepository, UserRepository>();

builder.Services.AddScoped<IStudyRepository, StudyRepository>();

// JWT kimlik doğrulama
var jwtSecret = builder.Configuration["JwtSecret"]
    ?? throw new InvalidOperationException("JwtSecret bulunamadı.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,                  // süresi dolan token reddedilsin
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddHttpClient();
builder.Services.AddScoped<IWordRepository, WordRepository>();
builder.Services.AddScoped<WordDetailsService>();
builder.Services.AddScoped<IHardRepository, HardRepository>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<WordNetworkService>();

var app = builder.Build();

// Tüm hataları yakalayan middleware en başta olmalı ki sonraki adımlardaki hataları da yakalasın
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Canlıda React'in derlenmiş dosyaları wwwroot'tan sunulacak
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();   // önce "kimsin?"
app.UseAuthorization();    // sonra "buna yetkin var mı?"

app.MapControllers();
app.MapFallbackToFile("index.html");   // React sayfa yenilemelerinde index.html dönsün

app.Run();