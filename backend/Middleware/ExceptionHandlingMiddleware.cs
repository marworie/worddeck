namespace WordDeck.Middleware
{
    // Yakalanmamış tüm hataları tek yerde yakalar, loglar ve düzgün JSON döndürür
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Hata oluştu: {Method} {Path}", context.Request.Method, context.Request.Path);

                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new
                {
                    message = "Sunucuda bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
                    detail = _env.IsDevelopment() ? ex.Message : null   // canlıda iç detay gizli
                });
            }
        }
    }
}