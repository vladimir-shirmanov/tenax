using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tenax.Domain.Decks;
using Tenax.Domain.Flashcards;

namespace Tenax.Infrastructure.Persistence.Configurations;

public sealed class FlashcardConfiguration : IEntityTypeConfiguration<Flashcard>
{
    public void Configure(EntityTypeBuilder<Flashcard> builder)
    {
        builder.ToTable("flashcards");

        builder.HasKey(flashcard => flashcard.Id);

        builder.Property(flashcard => flashcard.Id)
            .HasColumnName("id")
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(flashcard => flashcard.DeckId)
            .HasColumnName("deck_id")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(flashcard => flashcard.Term)
            .HasColumnName("term")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(flashcard => flashcard.Definition)
            .HasColumnName("definition")
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(flashcard => flashcard.ImageUrl)
            .HasColumnName("image_url")
            .HasMaxLength(2048);

        builder.Property(flashcard => flashcard.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(flashcard => flashcard.UpdatedAtUtc)
            .HasColumnName("updated_at_utc")
            .IsRequired();

        builder.Property(flashcard => flashcard.CreatedByUserId)
            .HasColumnName("created_by_user_id")
            .HasMaxLength(128);

        builder.Property(flashcard => flashcard.UpdatedByUserId)
            .HasColumnName("updated_by_user_id")
            .HasMaxLength(128);

        builder.HasIndex(flashcard => new { flashcard.DeckId, flashcard.UpdatedAtUtc, flashcard.Id })
            .HasDatabaseName("ix_flashcards_deck_updated_id");

        builder.HasOne<Deck>()
            .WithMany()
            .HasForeignKey(flashcard => flashcard.DeckId)
            .OnDelete(DeleteBehavior.Cascade);

    }
}
