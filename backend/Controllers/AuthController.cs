using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using WordDeck.Dtos;
using WordDeck.Models;
using WordDeck.Repositories;

// Kayıt ol ve giriş yap 

namespace WordDeck.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _users;
        private readonly IConfiguration _configuration;

        public AuthController(IUserRepository users, IConfiguration configuration)
        {
            _users = users;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            string username = dto.Username.Trim();

            if (await _users.GetByUsernameAsync(username) != null)
                return BadRequest(new { message = "Bu kullanıcı adı zaten alınmış" });

            // Şifre düz metin saklanmaz, BCrypt ile hash'lenir
            int id = await _users.AddAsync(username, BCrypt.Net.BCrypt.HashPassword(dto.Password));
            return Ok(new { message = "Kullanıcı oluşturuldu", id });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _users.GetByUsernameAsync(dto.Username.Trim());

            // Kullanıcı yoksa da şifre yanlışsa da aynı mesaj: hangi kullanıcıların var olduğu sızmasın
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { message = "Kullanıcı adı veya şifre hatalı" });

            return Ok(new { username = user.Username, token = GenerateJwtToken(user) });
        }

        // Kullanıcı bilgilerinden imzalı bir JWT üretir (7 gün geçerli)
        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSecret"]!));

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username)
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}