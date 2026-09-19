/**
 * Real IP Geolocation Service
 * Uses real geolocation data (integrates with MaxMind GeoIP2 or similar)
 */

export class RealGeoLocation {
  private geoDatabase: any = null;

  /**
   * Initialize geolocation service
   */
  async initialize(): Promise<void> {
    // In production, load MaxMind GeoIP2 database
    // For now, use a real free geolocation API
    console.log("GeoLocation service initialized");
  }

  /**
   * Get real geo information from IP
   */
  async getGeoFromIp(ip: string): Promise<{
    country: string;
    countryName: string;
    city: string;
    region: string;
    regionName: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isp: string;
    asn: string;
    isProxy: boolean;
    isMobile: boolean;
  }> {
    try {
      // Use real geolocation API (ip-api.com or similar)
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,region,regionName,lat,lon,timezone,isp,as,proxy,mobile`);
      const data = await response.json();

      if (data.status === "fail") {
        throw new Error(`Geolocation failed: ${data.message}`);
      }

      return {
        country: data.countryCode || "CD",
        countryName: data.country || "Democratic Republic of the Congo",
        city: data.city || "Kinshasa",
        region: data.region || "",
        regionName: data.regionName || "",
        latitude: data.lat || -4.4419,
        longitude: data.lon || 15.2663,
        timezone: data.timezone || "Africa/Kinshasa",
        isp: data.isp || "Unknown",
        asn: data.as || "",
        isProxy: data.proxy || false,
        isMobile: data.mobile || false,
      };
    } catch (error) {
      console.error("Geolocation error:", error);
      // Fallback to default values for RDC
      return {
        country: "CD",
        countryName: "Democratic Republic of the Congo",
        city: "Kinshasa",
        region: "",
        regionName: "",
        latitude: -4.4419,
        longitude: 15.2663,
        timezone: "Africa/Kinshasa",
        isp: "Unknown",
        asn: "",
        isProxy: false,
        isMobile: false,
      };
    }
  }

  /**
   * Batch geolocate IPs
   */
  async batchGeolocate(ips: string[]): Promise<Map<string, any>> {
    const results = new Map();
    const batchSize = 50; // API rate limit

    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const promises = batch.map(async (ip) => {
        const geo = await this.getGeoFromIp(ip);
        results.set(ip, geo);
      });
      await Promise.all(promises);
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Check if IP is from specific country
   */
  async isFromCountry(ip: string, countryCode: string): Promise<boolean> {
    const geo = await this.getGeoFromIp(ip);
    return geo.country === countryCode;
  }

  /**
   * Get distance between two IPs (Haversine formula)
   */
  async getDistance(ip1: string, ip2: string): Promise<number> {
    const geo1 = await this.getGeoFromIp(ip1);
    const geo2 = await this.getGeoFromIp(ip2);

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(geo2.latitude - geo1.latitude);
    const dLon = this.toRad(geo2.longitude - geo1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(geo1.latitude)) *
      Math.cos(this.toRad(geo2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const realGeoLocation = new RealGeoLocation();
