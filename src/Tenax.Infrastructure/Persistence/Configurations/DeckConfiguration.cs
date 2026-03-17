using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tenax.Domain.Decks;

namespace Tenax.Infrastructure.Persistence.Configurations;

public sealed class DeckConfiguration : IEntityTypeConfiguration<Deck>
{
    public void Configure(EntityTypeBuilder<Deck> builder)
    {
        var seedTimestamp = new DateTimeOffset(2026, 3, 17, 9, 0, 0, TimeSpan.Zero);

        builder.ToTable("decks");

        builder.HasKey(deck => deck.Id);

        builder.Property(deck => deck.Id)
            .HasColumnName("id")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(deck => deck.OwnerUserId)
            .HasColumnName("owner_user_id")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(deck => deck.Name)
            .HasColumnName("name")
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(deck => deck.Description)
            .HasColumnName("description")
            .HasMaxLength(1000);

        builder.Property(deck => deck.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(deck => deck.UpdatedAtUtc)
            .HasColumnName("updated_at_utc")
            .IsRequired();

        builder.Property(deck => deck.CreatedByUserId)
            .HasColumnName("created_by_user_id")
            .HasMaxLength(128);

        builder.Property(deck => deck.UpdatedByUserId)
            .HasColumnName("updated_by_user_id")
            .HasMaxLength(128);

        builder.HasIndex(deck => new { deck.OwnerUserId, deck.UpdatedAtUtc, deck.Id })
            .HasDatabaseName("ix_decks_owner_updated_id");

        builder.HasData(
            new Deck("deck_owned", "Spanish Basics", "Everyday greetings and introductions", seedTimestamp, seedTimestamp, "usr_42", "usr_42", "usr_42"),
            new Deck("deck_forbidden", "French Basics", "Introductory verbs and greetings", seedTimestamp, seedTimestamp, "usr_other", "usr_other", "usr_other"));
    }
}
