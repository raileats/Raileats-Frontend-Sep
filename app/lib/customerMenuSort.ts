export const CUSTOMER_MENU_TYPES = [
  "Thalis",
  "Combos",
  "Breakfast",
  "Rice And Biryani",
  "Dal and Subzi",
  "Chicken and Mutton",
  "Roti Paratha",
  "Chinese",
  "Pizza and Sandwiches",
  "Fast Food",
  "Burger",
  "Starters and Snacks",
  "Sweets",
  "Beverages",
  "Restro Specials",
  "Bakery",
  "Bulk",
] as const;

const MENU_TYPE_RANKS = new Map(
  CUSTOMER_MENU_TYPES.map((menuType, index) => [menuType.toLowerCase(), index + 1])
);

export function getCustomerMenuTypeRank(item: any) {
  if ("menu_type_rank" in (item || {}) || "MenuTypeRank" in (item || {})) {
    const explicitRank = Number(item?.menu_type_rank ?? item?.MenuTypeRank);
    return Number.isInteger(explicitRank) && explicitRank >= 1 && explicitRank <= 17
      ? explicitRank
      : null;
  }

  const menuType = String(item?.menu_type ?? item?.MenuType ?? "")
    .trim()
    .toLowerCase();

  return MENU_TYPE_RANKS.get(menuType) ?? null;
}

function sortableMenuTypeRank(item: any) {
  return getCustomerMenuTypeRank(item) ?? Number.POSITIVE_INFINITY;
}

function basePrice(item: any) {
  const price = Number(
    item?.base_price ??
      item?.BasePrice ??
      item?.selling_price ??
      item?.SellingPrice ??
      item?.price
  );

  return Number.isFinite(price) ? price : Number.POSITIVE_INFINITY;
}

function itemName(item: any) {
  return String(item?.item_name ?? item?.ItemName ?? item?.name ?? "").trim();
}

export function compareCustomerMenuItems(left: any, right: any) {
  const rankDifference = sortableMenuTypeRank(left) - sortableMenuTypeRank(right);
  if (rankDifference !== 0 && !Number.isNaN(rankDifference)) return rankDifference;

  const priceDifference = basePrice(left) - basePrice(right);
  if (priceDifference !== 0 && !Number.isNaN(priceDifference)) return priceDifference;

  return itemName(left).localeCompare(itemName(right), "en", {
    sensitivity: "base",
    numeric: true,
  });
}

export function sortCustomerMenuItems<T>(items: T[]) {
  return [...items].sort(compareCustomerMenuItems);
}

export function sortCustomerMenuItemsWithPriority<T>(
  items: T[],
  selectedMenuType?: string | null
) {
  const sortedItems = sortCustomerMenuItems(items);
  const selected = String(selectedMenuType || "").trim().toLowerCase();

  if (!selected) return sortedItems;

  return [
    ...sortedItems.filter(
      (item: any) => String(item?.menu_type || item?.MenuType || "").trim().toLowerCase() === selected
    ),
    ...sortedItems.filter(
      (item: any) => String(item?.menu_type || item?.MenuType || "").trim().toLowerCase() !== selected
    ),
  ];
}
