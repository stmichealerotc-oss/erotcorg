/**
 * API Client for Orthodox Library
 * Connects to backend API for real data
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface Book {
  _id: string;
  title: string;
  titleGez?: string;
  titleTi?: string;
  description?: string;
  type: 'liturgy' | 'hymn' | 'prayer' | 'scripture' | 'devotional';
  tradition?: string;
  languages: string[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  blockCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LiturgicalBlock {
  _id: string;
  bookId: string;
  section: string;
  verseNumber: number;
  globalOrder: number;
  role: 'priest' | 'deacon' | 'people' | 'cantor' | 'narrator' | 'all' | 'rubric' | 'instruction';
  translations: {
    gez?: string;
    ti?: string;
    am?: string;
    en?: string;
    ar?: string;
  };
  isRubric: boolean;
  isResponsive: boolean;
  isOptional: boolean;
  displayColor?: any;
  fontSize?: string;
  notes?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class LibraryAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/library`;
  }

  /**
   * Fetch all books
   */
  async getBooks(params?: {
    status?: string;
    type?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Book[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.type) queryParams.append('type', params.type);
      if (params?.featured !== undefined) queryParams.append('featured', String(params.featured));
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.limit) queryParams.append('limit', String(params.limit));

      const url = `${this.baseUrl}/books?${queryParams.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching books:', error);
      throw error;
    }
  }

  /**
   * Search books
   */
  async searchBooks(query: string): Promise<ApiResponse<Book[]>> {
    try {
      const url = `${this.baseUrl}/books/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching books:', error);
      throw error;
    }
  }

  /**
   * Get single book by ID
   */
  async getBook(bookId: string): Promise<ApiResponse<Book>> {
    try {
      const url = `${this.baseUrl}/books/${bookId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching book:', error);
      throw error;
    }
  }

  /**
   * Get all blocks for a book
   */
  async getBookBlocks(bookId: string, section?: string): Promise<ApiResponse<LiturgicalBlock[]>> {
    try {
      const queryParams = section ? `?section=${section}` : '';
      const url = `${this.baseUrl}/books/${bookId}/blocks${queryParams}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching blocks:', error);
      throw error;
    }
  }

  /**
   * Get single block
   */
  async getBlock(bookId: string, blockId: string): Promise<ApiResponse<LiturgicalBlock>> {
    try {
      const url = `${this.baseUrl}/books/${bookId}/blocks/${blockId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching block:', error);
      throw error;
    }
  }

  /**
   * Create new book (admin only)
   */
  async createBook(bookData: Partial<Book>, token?: string): Promise<ApiResponse<Book>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/books`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bookData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  }

  /**
   * Update book (admin only)
   */
  async updateBook(bookId: string, bookData: Partial<Book>, token?: string): Promise<ApiResponse<Book>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/books/${bookId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(bookData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating book:', error);
      throw error;
    }
  }

  /**
   * Create new block (admin only)
   */
  async createBlock(bookId: string, blockData: Partial<LiturgicalBlock>, token?: string): Promise<ApiResponse<LiturgicalBlock>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/books/${bookId}/blocks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(blockData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating block:', error);
      throw error;
    }
  }

  /**
   * Update block (admin only)
   */
  async updateBlock(bookId: string, blockId: string, blockData: Partial<LiturgicalBlock>, token?: string): Promise<ApiResponse<LiturgicalBlock>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/books/${bookId}/blocks/${blockId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(blockData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating block:', error);
      throw error;
    }
  }

  /**
   * Delete block (admin only)
   */
  async deleteBlock(bookId: string, blockId: string, token?: string): Promise<ApiResponse<any>> {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/books/${bookId}/blocks/${blockId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting block:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const libraryAPI = new LibraryAPI();
export default libraryAPI;
