export function extractLocaleFromFilePath(filepath: string) {
    const pattern = /(?=(\/|.|-|_))[a-z]{2}(-|_)[A-Z]{2}(?=(\/|.|-|_))/;
    const match = filepath.match(pattern);
    return match ? match[0] : null;
}
