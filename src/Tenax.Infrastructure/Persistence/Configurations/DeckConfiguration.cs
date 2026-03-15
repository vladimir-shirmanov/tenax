using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tenax.Domain.Decks;

namespace Tenax.Infrastructure.Persistence.Configurations;

public sealed class DeckConfiguration : IEntityTypeConfiguration<Deck>
{
    public void Configure(EntityTypeBuilder<Deck> builder)
    {
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

        builder.HasData(
            new Deck("deck_owned", "usr_42"),
            new Deck("deck_forbidden", "usr_other"));
    }
}
