using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Tenax.Application.Flashcards;
using Tenax.Application.Flashcards.Validation;

namespace Tenax.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IFlashcardService, FlashcardService>();

        services.AddScoped<IValidator<CreateFlashcardInput>, CreateFlashcardInputValidator>();
        services.AddScoped<IValidator<UpdateFlashcardInput>, UpdateFlashcardInputValidator>();
        services.AddScoped<IValidator<ListFlashcardsInput>, ListFlashcardsInputValidator>();

        return services;
    }
}
