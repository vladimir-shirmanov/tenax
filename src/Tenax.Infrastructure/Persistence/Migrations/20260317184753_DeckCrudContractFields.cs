using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenax.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DeckCrudContractFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "created_at_utc",
                table: "decks",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "created_by_user_id",
                table: "decks",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "decks",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "name",
                table: "decks",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "updated_at_utc",
                table: "decks",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "updated_by_user_id",
                table: "decks",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "decks",
                keyColumn: "id",
                keyValue: "deck_forbidden",
                columns: new[] { "created_at_utc", "created_by_user_id", "description", "name", "updated_at_utc", "updated_by_user_id" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 3, 17, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "usr_other", "Introductory verbs and greetings", "French Basics", new DateTimeOffset(new DateTime(2026, 3, 17, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "usr_other" });

            migrationBuilder.UpdateData(
                table: "decks",
                keyColumn: "id",
                keyValue: "deck_owned",
                columns: new[] { "created_at_utc", "created_by_user_id", "description", "name", "updated_at_utc", "updated_by_user_id" },
                values: new object[] { new DateTimeOffset(new DateTime(2026, 3, 17, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "usr_42", "Everyday greetings and introductions", "Spanish Basics", new DateTimeOffset(new DateTime(2026, 3, 17, 9, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "usr_42" });

            migrationBuilder.CreateIndex(
                name: "ix_decks_owner_updated_id",
                table: "decks",
                columns: new[] { "owner_user_id", "updated_at_utc", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_decks_owner_updated_id",
                table: "decks");

            migrationBuilder.DropColumn(
                name: "created_at_utc",
                table: "decks");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "decks");

            migrationBuilder.DropColumn(
                name: "description",
                table: "decks");

            migrationBuilder.DropColumn(
                name: "name",
                table: "decks");

            migrationBuilder.DropColumn(
                name: "updated_at_utc",
                table: "decks");

            migrationBuilder.DropColumn(
                name: "updated_by_user_id",
                table: "decks");
        }
    }
}
