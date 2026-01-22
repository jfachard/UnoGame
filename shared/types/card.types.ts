export enum CardColor {
  RED = "red",
  BLUE = "blue",
  GREEN = "green",
  YELLOW = "yellow",
}

export enum CardValue {
  ZERO = "0",
  ONE = "1",
  TWO = "2",
  THREE = "3",
  FOUR = "4",
  FIVE = "5",
  SIX = "6",
  SEVEN = "7",
  EIGHT = "8",
  NINE = "9",
  SKIP = "skip",
  REVERSE = "reverse",
  DRAW_TWO = "+2",
  WILD = "wild",
  WILD_DRAW_FOUR = "+4",
}

export interface Card {
  id: string;
  color: CardColor | null;
  value: CardValue;
}
