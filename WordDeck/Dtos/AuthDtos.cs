using System.ComponentModel.DataAnnotations;

namespace WordDeck.Dtos
{
    // Kullanıcı adı kuralları tek yerde
    public static class UsernameRules
    {
        public const string Pattern = @"^[a-zA-Z0-9_.çğıöşüÇĞİÖŞÜ]+$";
        public const string PatternMessage = "Kullanıcı adında sadece harf, rakam, nokta ve _ olabilir.";
    }

    public class RegisterDto
    {
        [Required(ErrorMessage = "Kullanıcı adı zorunludur.")]
        [StringLength(30, MinimumLength = 3, ErrorMessage = "Kullanıcı adı 3-30 karakter olmalı.")]
        [RegularExpression(UsernameRules.Pattern, ErrorMessage = UsernameRules.PatternMessage)]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Şifre zorunludur.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Şifre en az 6 karakter olmalı.")]
        public string Password { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        [Required(ErrorMessage = "Kullanıcı adı zorunludur.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Şifre zorunludur.")]
        public string Password { get; set; } = string.Empty;
    }
}