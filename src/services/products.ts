import api from '../lib/api';
import type { AxiosError } from 'axios';

export type ProductType = 'PLATO' | 'BEBIDA' | 'POSTRE';

export type ProductInput = {
  name: string;
  price: number;
  description: string;
  productType: ProductType;
  imageUrl?: string;
  active?: boolean; 
};

export type Product = ProductInput & {
  id: number;
  createdAt?: string;
  updatedAt?: string;
};

const extractMessage = (error: unknown): string => {
  const err = error as any;
  // Log útil en consola
  console.error('[POST /products] error:', {
    status: err?.response?.status,
    data: err?.response?.data,
  });
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    `Error ${err?.response?.status || ''}`.trim() ||
    'No se pudo completar la operación'
  );
};

export async function createProduct(input: ProductInput): Promise<Product> {
  try {
    const { data } = await api.post<Product>('/products', input);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const { data } = await api.get<Product[]>('/products');
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

export async function getProductById(id: number): Promise<Product> {
  try {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}