/**
 * Real Structured Data Detection Service
 * Parses HTML and detects real structured data (JSON-LD, Microdata, RDFa)
 */

export class RealStructuredData {
  /**
   * Detect structured data from HTML content
   */
  detectStructuredData(html: string, url: string): {
    detected: boolean;
    types: string[];
    schemas: Array<{
      type: string;
      format: "json-ld" | "microdata" | "rdfa";
      data: any;
      validity: "valid" | "invalid" | "warning";
      errors: string[];
    }>;
    summary: {
      totalSchemas: number;
      validSchemas: number;
      invalidSchemas: number;
      warningSchemas: number;
    };
  } {
    const schemas: any[] = [];

    // Detect JSON-LD
    const jsonLdSchemas = this.detectJsonLd(html);
    schemas.push(...jsonLdSchemas);

    // Detect Microdata
    const microdataSchemas = this.detectMicrodata(html);
    schemas.push(...microdataSchemas);

    // Detect RDFa
    const rdfaSchemas = this.detectRdfa(html);
    schemas.push(...rdfaSchemas);

    // Validate schemas
    const validatedSchemas = schemas.map((schema) => ({
      ...schema,
      validity: this.validateSchema(schema),
      errors: this.getSchemaErrors(schema),
    }));

    const types = [...new Set(validatedSchemas.map((s) => s.type))];

    const summary = {
      totalSchemas: validatedSchemas.length,
      validSchemas: validatedSchemas.filter((s) => s.validity === "valid").length,
      invalidSchemas: validatedSchemas.filter((s) => s.validity === "invalid").length,
      warningSchemas: validatedSchemas.filter((s) => s.validity === "warning").length,
    };

    return {
      detected: validatedSchemas.length > 0,
      types,
      schemas: validatedSchemas,
      summary,
    };
  }

  /**
   * Detect JSON-LD structured data
   */
  private detectJsonLd(html: string): Array<{
    type: string;
    format: "json-ld";
    data: any;
  }> {
    const schemas: any[] = [];
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);

        if (Array.isArray(data)) {
          data.forEach((item) => {
            if (item["@type"]) {
              schemas.push({
                type: item["@type"],
                format: "json-ld",
                data: item,
              });
            }
          });
        } else if (data["@type"]) {
          schemas.push({
            type: data["@type"],
            format: "json-ld",
            data,
          });
        }
      } catch (error) {
        console.error("JSON-LD parse error:", error);
      }
    }

    return schemas;
  }

  /**
   * Detect Microdata structured data
   */
  private detectMicrodata(html: string): Array<{
    type: string;
    format: "microdata";
    data: any;
  }> {
    const schemas: any[] = [];
    const itemScopeRegex = /<[^>]+itemscope[^>]*itemtype=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = itemScopeRegex.exec(html)) !== null) {
      const itemType = match[1];
      const type = itemType.split("/").pop() || itemType;

      // Extract properties (simplified - full parser would be more complex)
      const properties = this.extractMicrodataProperties(html, match.index);

      schemas.push({
        type,
        format: "microdata",
        data: {
          "@type": type,
          ...properties,
        },
      });
    }

    return schemas;
  }

  /**
   * Extract Microdata properties
   */
  private extractMicrodataProperties(html: string, startIndex: number): Record<string, any> {
    const properties: Record<string, any> = {};
    const itemPropRegex = /<[^>]+itemprop=["']([^"']+)["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
    let match;

    // Search in a reasonable window around the itemscope
    const searchWindow = html.slice(startIndex, startIndex + 5000);
    itemPropRegex.lastIndex = 0;

    while ((match = itemPropRegex.exec(searchWindow)) !== null) {
      const propName = match[1];
      const propValue = match[2].trim();

      // Remove HTML tags from value
      const cleanValue = propValue.replace(/<[^>]+>/g, "").trim();

      properties[propName] = cleanValue;
    }

    return properties;
  }

  /**
   * Detect RDFa structured data
   */
  private detectRdfa(html: string): Array<{
    type: string;
    format: "rdfa";
    data: any;
  }> {
    const schemas: any[] = [];
    const typeofRegex = /<[^>]+typeof=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = typeofRegex.exec(html)) !== null) {
      const type = match[1];
      const typeShort = type.split(":").pop() || type;

      // Extract properties (simplified)
      const properties = this.extractRdfaProperties(html, match.index);

      schemas.push({
        type: typeShort,
        format: "rdfa",
        data: {
          "@type": type,
          ...properties,
        },
      });
    }

    return schemas;
  }

  /**
   * Extract RDFa properties
   */
  private extractRdfaProperties(html: string, startIndex: number): Record<string, any> {
    const properties: Record<string, any> = {};
    const propertyRegex = /<[^>]+property=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    let match;

    const searchWindow = html.slice(startIndex, startIndex + 5000);
    propertyRegex.lastIndex = 0;

    while ((match = propertyRegex.exec(searchWindow)) !== null) {
      const propName = match[1];
      const propValue = match[2];

      properties[propName] = propValue;
    }

    return properties;
  }

  /**
   * Validate schema against Schema.org
   */
  private validateSchema(schema: any): "valid" | "invalid" | "warning" {
    // Check required fields based on type
    const requiredFields = this.getRequiredFields(schema.type);

    for (const field of requiredFields) {
      if (!schema.data[field]) {
        return "invalid";
      }
    }

    // Check recommended fields
    const recommendedFields = this.getRecommendedFields(schema.type);
    let missingRecommended = 0;

    for (const field of recommendedFields) {
      if (!schema.data[field]) {
        missingRecommended++;
      }
    }

    if (missingRecommended > recommendedFields.length / 2) {
      return "warning";
    }

    return "valid";
  }

  /**
   * Get required fields for schema type
   */
  private getRequiredFields(type: string): string[] {
    const requiredFields: Record<string, string[]> = {
      Organization: ["name", "url"],
      Article: ["headline", "author", "datePublished"],
      Product: ["name", "image", "description"],
      LocalBusiness: ["name", "address"],
      BreadcrumbList: ["itemListElement"],
      WebSite: ["url", "name"],
      Person: ["name"],
      Event: ["name", "startDate", "location"],
    };

    return requiredFields[type] || [];
  }

  /**
   * Get recommended fields for schema type
   */
  private getRecommendedFields(type: string): string[] {
    const recommendedFields: Record<string, string[]> = {
      Organization: ["logo", "description", "sameAs", "address", "telephone"],
      Article: ["image", "description", "publisher", "dateModified"],
      Product: ["brand", "offers", "aggregateRating", "review"],
      LocalBusiness: ["telephone", "openingHours", "priceRange"],
      BreadcrumbList: [],
      WebSite: ["description", "potentialAction"],
      Person: ["url", "sameAs", "jobTitle"],
      Event: ["endDate", "description", "image", "performer"],
    };

    return recommendedFields[type] || [];
  }

  /**
   * Get schema errors
   */
  private getSchemaErrors(schema: any): string[] {
    const errors: string[] = [];
    const requiredFields = this.getRequiredFields(schema.type);

    for (const field of requiredFields) {
      if (!schema.data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check for invalid data types
    if (schema.data.datePublished && !this.isValidDate(schema.data.datePublished)) {
      errors.push("Invalid date format for datePublished");
    }

    if (schema.data.startDate && !this.isValidDate(schema.data.startDate)) {
      errors.push("Invalid date format for startDate");
    }

    if (schema.data.image && !this.isValidUrl(schema.data.image)) {
      errors.push("Invalid URL for image");
    }

    if (schema.data.url && !this.isValidUrl(schema.data.url)) {
      errors.push("Invalid URL for url");
    }

    return errors;
  }

  /**
   * Validate date format
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Validate URL format
   */
  private isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate recommended structured data for a page
   */
  generateRecommendedSchema(url: string, html: string, pageType: string): {
    recommended: string[];
    jsonLd: string;
  } {
    const recommendations: string[] = [];

    // Analyze page content
    const hasProduct = html.includes("price") || html.includes("add to cart");
    const hasArticle = html.includes("article") || html.includes("post");
    const hasOrganization = html.includes("about") || html.includes("contact");
    const hasBreadcrumb = html.includes("breadcrumb") || html.includes("nav");

    if (hasProduct) {
      recommendations.push("Product");
    }

    if (hasArticle) {
      recommendations.push("Article");
    }

    if (hasOrganization) {
      recommendations.push("Organization");
    }

    if (hasBreadcrumb) {
      recommendations.push("BreadcrumbList");
    }

    // Always recommend WebSite
    recommendations.push("WebSite");

    // Generate JSON-LD template
    const jsonLd = this.generateJsonLdTemplate(url, recommendations);

    return {
      recommended: recommendations,
      jsonLd,
    };
  }

  /**
   * Generate JSON-LD template
   */
  private generateJsonLdTemplate(url: string, types: string[]): string {
    const baseSchema = {
      "@context": "https://schema.org",
      "@type": types[0] || "WebSite",
      url,
      name: "Your Site Name",
    };

    if (types.includes("Organization")) {
      Object.assign(baseSchema, {
        "@type": "Organization",
        name: "Your Organization",
        url,
        logo: "https://yourdomain.com/logo.png",
        description: "Your organization description",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Your Address",
          addressLocality: "City",
          addressRegion: "Region",
          postalCode: "Postal Code",
          addressCountry: "CD",
        },
      });
    }

    if (types.includes("WebSite")) {
      Object.assign(baseSchema, {
        "@type": "WebSite",
        name: "Your Site Name",
        url,
        description: "Your site description",
        potentialAction: {
          "@type": "SearchAction",
          target: `${url}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      });
    }

    return `<script type="application/ld+json">
${JSON.stringify(baseSchema, null, 2)}
</script>`;
  }
}

export const realStructuredData = new RealStructuredData();
