import { DeepPartial, In } from 'typeorm';
import { ProductVariant } from '../../entities/products/productVariantEntity';
import BaseRepository from '../baseRepository';
import { ProductRepository } from './productRepository';

class ProductVariantRepository extends BaseRepository<ProductVariant> {
  private productRepository = new ProductRepository();

  constructor() {
    super(ProductVariant);
  }

  /**
   * Creates a new ProductVariant.
   * @param variantData - Data for the new ProductVariant.
   * @returns The created ProductVariant entity.
   */
  async createProductVariant(
    variantData: DeepPartial<ProductVariant>
  ): Promise<ProductVariant> {
    return this.create(variantData).catch((error) =>
      this.handleError(error, 'Error creating new ProductVariant')
    );
  }

  /**
   * Updates a ProductVariant by its SKU.
   * @param sku - The SKU of the ProductVariant.
   * @param updateData - Partial data to update the variant.
   * @returns The updated ProductVariant entity.
   */
  async updateProductVariantBySku(
    sku: string,
    updateData: DeepPartial<ProductVariant>
  ): Promise<ProductVariant> {
    const variant = await this.ensureVariantExistsBySku(sku); // This now guarantees `variant` is not null.
    await this.update(variant.id, updateData);
    const updatedVariant = await this.findById(variant.id);
    if (!updatedVariant) {
      throw new Error(
        `Failed to retrieve updated ProductVariant with SKU: ${sku}`
      );
    }
    return updatedVariant;
  }

  /**
   * Retrieves a ProductVariant by its SKU.
   * @param sku - The SKU of the ProductVariant.
   * @returns The ProductVariant entity.
   */
  async getProductVariantBySku(sku: string): Promise<ProductVariant> {
    return this.findOne({ where: { sku }, relations: ['product'] }).then(
      (variant) => {
        if (!variant) {
          throw new Error(`ProductVariant not found for SKU: ${sku}`);
        }
        return variant;
      }
    );
  }

  /**
   * Ensures a ProductVariant exists by its SKU.
   * @param sku - The SKU of the ProductVariant.
   * @returns The existing ProductVariant entity.
   */
  private async ensureVariantExistsBySku(sku: string): Promise<ProductVariant> {
    const variant = await this.getProductVariantBySku(sku);
    if (!variant) {
      throw new Error(`ProductVariant not found for SKU: ${sku}`);
    }
    return variant;
  }

  /**
   * Retrieves all variants for a specific product by product ID.
   * @param productId - The ID of the product.
   * @returns Array of ProductVariant entities associated with the product.
   */
  async getVariantsByProductId(productId: string): Promise<ProductVariant[]> {
    return this.find({ where: { product: { id: productId } } }).catch((error) =>
      this.handleError(
        error,
        `Error retrieving variants for Product with ID: ${productId}`
      )
    );
  }

  /**
   * Retrieves all variants for a specific product by product SKU.
   * @param sku - The SKU of the product.
   * @returns Array of ProductVariant entities associated with the product.
   */
  async getVariantsByProductSku(sku: string): Promise<ProductVariant[]> {
    const product = await this.productRepository.getProductBySku(sku);
    if (!product) {
      throw new Error(`Product not found for SKU: ${sku}`);
    }
    return this.getVariantsByProductId(product.id);
  }

  /**
   * Updates stock quantity for a specific ProductVariant by SKU.
   * @param sku - The SKU of the ProductVariant.
   * @param quantity - The new stock quantity to set.
   */
  async updateStockQuantityBySku(sku: string, quantity: number): Promise<void> {
    const variant = await this.ensureVariantExistsBySku(sku);
    await this.update(variant.id, { stockQuantity: quantity }).catch((error) =>
      this.handleError(
        error,
        `Error updating stock quantity for ProductVariant with SKU: ${sku}`
      )
    );
  }

  /**
   * Deletes a ProductVariant by its SKU.
   * @param sku - The SKU of the ProductVariant.
   */
  async deleteProductVariantBySku(sku: string): Promise<void> {
    const variant = await this.ensureVariantExistsBySku(sku);
    await this.delete(variant.id).catch((error) =>
      this.handleError(error, `Error deleting ProductVariant with SKU: ${sku}`)
    );
  }

  /**
   * Deletes all variants associated with a specific product by product ID.
   * @param productId - The ID of the product.
   */
  async deleteVariantsByProductId(productId: string): Promise<void> {
    const variants = await this.getVariantsByProductId(productId);
    if (variants.length > 0) {
      const variantIds = variants.map((variant) => variant.id);
      await this.bulkDelete({ id: In(variantIds) });
    }
  }

  /**
   * Deletes all variants associated with a specific product by product SKU.
   * @param sku - The SKU of the product.
   */
  async deleteVariantsByProductSku(sku: string): Promise<void> {
    const product = await this.productRepository.getProductBySku(sku);
    if (!product) {
      throw new Error(`Product not found for SKU: ${sku}`);
    }
    await this.deleteVariantsByProductId(product.id);
  }
}

const productVariantRepository = new ProductVariantRepository();
export { productVariantRepository as default, ProductVariantRepository };
