export const queryKeys = {
  me: ["get", "/auth/me"] as const,
  featuredProperties: ["get", "/properties/featured"] as const,
  properties: ["get", "/properties"] as const,
  property: (id: string) => ["get", "/properties/{property_id}", id] as const,
  styles: ["get", "/styles"] as const,
  generations: (propertyId: string) =>
    ["get", "/generation/properties/{property_id}", propertyId] as const,
};
