import { DeepPartial, In } from 'typeorm';
import { ProductSpecification } from '../../entities/products/productSpecificationEntity';
import BaseRepository from '../baseRepository';
import { ProductRepository } from './productRepository';

class ProductSpecificationRepository extends BaseRepository<ProductSpecification> {
  private productRepository = new ProductRepository();

  constructor() {
    super(ProductSpecification);
  }

  /**
   * Creates a new ProductSpecification for a product.
   * @param specificationData - Data for the new ProductSpecification.
   * @returns The created ProductSpecification entity.
   */
  async createProductSpecification(
    specificationData: DeepPartial<ProductSpecification>
  ): Promise<ProductSpecification> {
    try {
      return await this.create(specificationData);
    } catch (error) {
      this.handleError(error, 'Error creating new ProductSpecification');
    }
  }

  /**
   * Updates a ProductSpecification by its ID.
   * @param id - The ID of the ProductSpecification.
   * @param updateData - Partial data to update the specification with.
   * @returns The updated ProductSpecification entity.
   */
  async updateProductSpecificationById(
    id: string,
    updateData: DeepPartial<ProductSpecification>
  ): Promise<ProductSpecification> {
    const specification = await this.ensureExistsById(
      id,
      'ProductSpecification'
    );
    await this.update(specification.id, updateData);
    return await this.ensureExistsById(
      specification.id,
      'ProductSpecification'
    );
  }

  /**
   * Retrieves all specifications for a specific product by product ID.
   * @param productId - The ID of the product.
   * @returns Array of ProductSpecification entities associated with the product.
   */
  async getSpecificationsByProductId(
    productId: string
  ): Promise<ProductSpecification[]> {
    return await this.find({
      where: { product: { id: productId } },
    });
  }

  /**
   * Retrieves all specifications for a specific product by SKU.
   * @param sku - The SKU of the product.
   * @returns Array of ProductSpecification entities associated with the product.
   */
  async getSpecificationsByProductSku(
    sku: string
  ): Promise<ProductSpecification[]> {
    const product = await this.ensureProductExistsBySku(sku);
    return await this.getSpecificationsByProductId(product.id);
  }

  /**
   * Updates specifications for a specific product by SKU.
   * @param sku - The SKU of the product.
   * @param specifications - Array of ProductSpecification entities to update or set.
   */
  async updateSpecificationsByProductSku(
    sku: string,
    specifications: DeepPartial<ProductSpecification>[]
  ): Promise<void> {
    const product = await this.ensureProductExistsBySku(sku);

    // Delete existing specifications and add new ones
    await this.deleteSpecificationsByProductId(product.id);
    await this.createBulkSpecifications(product.id, specifications);
  }

  /**
   * Deletes all specifications associated with a specific product by SKU.
   * @param sku - The SKU of the product.
   */
  async deleteSpecificationsByProductSku(sku: string): Promise<void> {
    const product = await this.ensureProductExistsBySku(sku);
    await this.deleteSpecificationsByProductId(product.id);
  }

  /**
   * Deletes all specifications associated with a specific product by product ID.
   * @param productId - The ID of the product.
   */
  async deleteSpecificationsByProductId(productId: string): Promise<void> {
    try {
      const specifications = await this.find({
        where: { product: { id: productId } },
      });
      if (specifications.length > 0) {
        const ids = specifications.map((spec) => spec.id);
        await this.bulkDelete({ id: In(ids) });
      }
    } catch (error) {
      this.handleError(
        error,
        `Error deleting specifications for product ID: ${productId}`
      );
    }
  }

  /**
   * Bulk creates ProductSpecifications for a product.
   * @param productId - The ID of the product.
   * @param specifications - Array of specifications to create.
   */
  private async createBulkSpecifications(
    productId: string,
    specifications: DeepPartial<ProductSpecification>[]
  ): Promise<void> {
    for (const spec of specifications) {
      await this.createProductSpecification({
        ...spec,
        product: { id: productId },
      });
    }
  }

  /**
   * Ensures a ProductSpecification exists by ID.
   * @param id - The ID of the ProductSpecification.
   * @param entityName - Name of the entity for error messages.
   * @returns The ProductSpecification entity.
   */
  private async ensureExistsById(
    id: string,
    entityName: string
  ): Promise<ProductSpecification> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`${entityName} not found for ID: ${id}`);
    }
    return entity;
  }

  /**
   * Ensures a Product exists by SKU.
   * @param sku - The SKU of the product.
   * @returns The Product entity.
   */
  private async ensureProductExistsBySku(sku: string) {
    const product = await this.productRepository.getProductBySku(sku);
    if (!product) {
      throw new Error(`Product not found for SKU: ${sku}`);
    }
    return product;
  }
}

const productSpecificationRepository = new ProductSpecificationRepository();
export {
  productSpecificationRepository as default,
  ProductSpecificationRepository,
};
