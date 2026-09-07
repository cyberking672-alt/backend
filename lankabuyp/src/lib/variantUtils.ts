export interface ParsedVariantInfo {
  cleanColor?: string;
  cleanSize?: string;
  displayKey: string;
}

const COMMON_COLOR_REGEX = /\b(black|white|blue green|sky blue|navy blue|dark blue|light blue|royal blue|blue|army green|mint green|dark green|light green|green|rose red|wine red|wine|burgundy|red|yellow|pink|rose|purple|violet|grey|gray|dark gray|light gray|silver|gold|brown|coffee|chocolate|orange|apricot|khaki|beige|cream|coral|camel|champagne|cyan)\b/i;

const COMMON_SIZE_REGEX = /\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL|XXL|XXXL|XXXXL|ONE\s?SIZE|FREE\s?SIZE|\d{2}\s?(?:CM|MM)?)\b/i;

export const parseVariantColorAndSize = (
  rawVariantKey: string,
  productTitle?: string,
  rawColor?: string,
  rawSize?: string
): ParsedVariantInfo => {
  let cleanColor: string | undefined = rawColor && rawColor.trim() ? rawColor.trim() : undefined;
  let cleanSize: string | undefined = rawSize && rawSize.trim() ? rawSize.trim().toUpperCase() : undefined;

  let workStr = String(rawVariantKey || '').trim();

  // If color and size are already cleanly separated and short (not full titles)
  if (cleanColor && cleanColor.length < 25 && cleanSize && cleanSize.length < 15) {
    // Check if color accidentally contains product title
    if (!COMMON_COLOR_REGEX.test(cleanColor) && cleanColor.length > 20) {
      cleanColor = undefined;
    }
  }

  // Strip product title if present in workStr
  if (productTitle && productTitle.length >= 4) {
    // Remove words in title from workStr
    const titleWords = productTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    let tempStr = workStr;
    for (const tw of titleWords) {
      const reg = new RegExp(`\\b${tw}\\b`, 'gi');
      tempStr = tempStr.replace(reg, '');
    }
    tempStr = tempStr.replace(/[\s\-_/\\,:]+/g, ' ').trim();
    if (tempStr.length > 0) {
      workStr = tempStr;
    }
  }

  // Try extracting size if not present
  if (!cleanSize) {
    const sizeMatch = workStr.match(COMMON_SIZE_REGEX);
    if (sizeMatch) {
      cleanSize = sizeMatch[0].toUpperCase().replace(/\s+/, '');
      // Remove matched size from workStr
      workStr = workStr.replace(sizeMatch[0], '').replace(/[\s\-_/\\,:]+/g, ' ').trim();
    }
  }

  // Try extracting color if not present
  if (!cleanColor) {
    const colorMatch = workStr.match(COMMON_COLOR_REGEX);
    if (colorMatch) {
      cleanColor = capitalizeWords(colorMatch[0]);
      // Remove matched color from workStr
      workStr = workStr.replace(colorMatch[0], '').replace(/[\s\-_/\\,:]+/g, ' ').trim();
    }
  }

  // Fallback if workStr still has leftover text
  if (!cleanColor && workStr.length > 0 && workStr.length < 25) {
    cleanColor = capitalizeWords(workStr);
  }

  const parts: string[] = [];
  if (cleanColor) parts.push(cleanColor);
  if (cleanSize) parts.push(cleanSize);

  const displayKey = parts.length > 0 ? parts.join(' / ') : (rawVariantKey || 'Standard');

  return {
    cleanColor,
    cleanSize,
    displayKey
  };
};

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
