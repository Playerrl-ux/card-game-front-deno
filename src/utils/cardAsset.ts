import { SerializedCard } from "@/shared/events.map";

/**
 * Returns the path to the card image asset in /assets/
 */
export function getCardAssetUrl(card: SerializedCard | null): string {
  if (!card) return "/assets/Deck.png";

  const colorCapitalized =
    card.color === "WILD"
      ? "Wild"
      : card.color.charAt(0).toUpperCase() + card.color.slice(1).toLowerCase();

  // Caso Coringa
  if (card.type === "WILD_CARD") {
    return "/assets/Wild.png";
  }
  if (card.type === "DRAW_4") {
    return "/assets/Wild_Draw.png";
  }

  // Caso Cartas de Ação
  if (card.type === "DRAW_2") {
    return `/assets/${colorCapitalized}_Draw.png`;
  }
  if (card.type === "REVERSE") {
    return `/assets/${colorCapitalized}_Reverse.png`;
  }
  if (card.type === "BLOCK") {
    return `/assets/${colorCapitalized}_Skip.png`;
  }

  // Caso Numéricas
  if (card.type === "NUMBERED" || typeof card.value === "number") {
    const val = card.value ?? 0;
    return `/assets/${colorCapitalized}_${val}.png`;
  }

  return "/assets/Deck.png";
}
