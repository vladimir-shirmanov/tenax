using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Tenax.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BaselinePostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "decks",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    owner_user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_decks", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "flashcards",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    deck_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    term = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    definition = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    image_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    updated_by_user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_flashcards", x => x.id);
                    table.ForeignKey(
                        name: "FK_flashcards_decks_deck_id",
                        column: x => x.deck_id,
                        principalTable: "decks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "decks",
                columns: new[] { "id", "owner_user_id" },
                values: new object[,]
                {
                    { "deck_forbidden", "usr_other" },
                    { "deck_owned", "usr_42" }
                });

            migrationBuilder.CreateIndex(
                name: "ix_flashcards_deck_updated_id",
                table: "flashcards",
                columns: new[] { "deck_id", "updated_at_utc", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "flashcards");

            migrationBuilder.DropTable(
                name: "decks");
        }
    }
}
