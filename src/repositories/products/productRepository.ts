import { DeepPartial } from 'typeorm';
import { Product } from '../../entities/products/productEntity';
import BaseRepository from '../baseRepository';

class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super(Product);
  }

  /**
   * Ensures a Product exists by its SKU or throws an error.
   * @param sku - The SKU of the Product.
   * @returns The Product entity.
   */
  private async ensureProductExistsBySku(sku: string): Promise<Product> {
    const product = await this.findOne({
      where: { sku },
      relations: ['specifications', 'variants', 'pricing'],
    });
    if (!product) {
      throw new Error(`Product not found for SKU: ${sku}`);
    }
    return product;
  }

  /**
   * Creates a new Product.
   * @param productData - Data for the new Product.
   * @returns The created Product entity.
   */
  async createProduct(productData: DeepPartial<Product>): Promise<Product> {
    return await this.create(productData);
  }

  /**
   * Updates a Product by its SKU.
   * @param sku - The SKU of the Product.
   * @param updateData - Partial data to update the Product with.
   * @returns The updated Product entity.
   */
  async updateProductBySku(
    sku: string,
    updateData: DeepPartial<Product>
  ): Promise<Product> {
    // Ensure the product exists
    const product = await this.ensureProductExistsBySku(sku);

    // Perform the update
    await this.update(product.id, updateData);

    // Retrieve the updated product and ensure it exists
    const updatedProduct = await this.findById(product.id);
    if (!updatedProduct) {
      throw new Error(
        `Failed to retrieve updated Product with ID: ${product.id}`
      );
    }

    return updatedProduct;
  }

  /**
   * Retrieves a Product by its SKU.
   * @param sku - The SKU of the Product.
   * @returns The Product entity or null if not found.
   */
  async getProductBySku(sku: string): Promise<Product | null> {
    return await this.findOne({
      where: { sku },
      relations: ['specifications', 'variants', 'pricing'],
    });
  }

  /**
   * Retrieves all active Products.
   * @returns Array of active Product entities.
   */
  async getActiveProducts(): Promise<Product[]> {
    return await this.find({
      where: { isActive: true },
      relations: ['specifications', 'variants', 'pricing'],
    });
  }

  /**
   * Activates or deactivates a Product by its SKU.
   * @param sku - The SKU of the Product.
   * @param isActive - Whether to activate or deactivate the Product.
   */
  async setProductActiveStatus(sku: string, isActive: boolean): Promise<void> {
    const product = await this.ensureProductExistsBySku(sku);
    await this.update(product.id, { isActive });
  }

  /**
   * Updates stock quantity for a specific Product by SKU.
   * @param sku - The SKU of the Product.
   * @param quantity - The new stock quantity to set.
   */
  async updateStockQuantity(sku: string, quantity: number): Promise<void> {
    const product = await this.ensureProductExistsBySku(sku);
    await this.update(product.id, { stockQuantity: quantity });
  }

  /**
   * Updates relationships for a specific Product by SKU.
   * @param sku - The SKU of the Product.
   * @param relationKey - The relation key to update (e.g., 'pricing', 'specifications', 'variants').
   * @param relationData - The data to set for the relation.
   */
  async updateProductRelation<T>(
    sku: string,
    relationKey: keyof Product,
    relationData: DeepPartial<T>
  ): Promise<void> {
    const product = await this.ensureProductExistsBySku(sku);
    await this.update(product.id, { [relationKey]: relationData });
  }

  /**
   * Deletes a Product by its SKU.
   * @param sku - The SKU of the Product.
   */
  async deleteProductBySku(sku: string): Promise<void> {
    const product = await this.ensureProductExistsBySku(sku);
    await this.delete(product.id);
  }
}

const productRepository = new ProductRepository();
export { productRepository as default, ProductRepository };
