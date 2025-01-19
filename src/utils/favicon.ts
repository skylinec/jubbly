interface HasWebsiteAndName {
  name: string;
  companyWebsite?: string;
}

function normalizeURL(urlString: string): string {
  if (urlString && !/^https?:\/\//i.test(urlString)) {
    return `https://${urlString}`;
  }
  return urlString;
}

export function fetchFavicon<T extends HasWebsiteAndName>(obj: T): string {
  try {
    if (obj.companyWebsite) {
      const domainString = normalizeURL(obj.companyWebsite);
      try {
        const url = new URL(domainString);
        return `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
      } catch (e) {
        console.error("Invalid URL:", domainString, e);
      }
    }

    const normalizedName = obj.name.replace(/\s+/g, "").toLowerCase();
    return `https://www.google.com/s2/favicons?sz=64&domain=${normalizedName}.com`;
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return "/default-favicon.png";
  }
}
