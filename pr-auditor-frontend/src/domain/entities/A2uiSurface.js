/**
 * A2uiSurface Entity (Domain Layer)
 * Represents an A2UI protocol UI surface container
 */
export class A2uiSurface {
  constructor({ surfaceId, catalogId, components }) {
    this.surfaceId = surfaceId || `surface_${Date.now()}`;
    this.catalogId = catalogId || 'basic_catalog_v0.9';
    this.components = components || [];
  }

  getRootComponent() {
    return this.components.find(c => c.id === 'root') || this.components[0] || null;
  }

  getComponentById(id) {
    return this.components.find(c => c.id === id) || null;
  }
}
