import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product, productService } from '@/services/productService';
import { Search, Plus, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProductSearchProps {
  onAddProduct: (product: Product, quantity?: number) => void;
}

export function ProductSearch({ onAddProduct }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const loadProducts = async () => {
      try {
        const products = await productService.fetchAllProducts();
        if (!mounted) return;
        
        if (!products || products.length === 0) {
          console.warn('No products loaded');
          setAllProducts([]);
          setSearchResults([]);
          return;
        }
        
        setAllProducts(products);
        setSearchResults(products.slice(0, 8)); // Show first 8 products initially
      } catch (e) {
        console.error('Failed to load products:', e);
        if (retryCount < maxRetries && mounted) {
          retryCount++;
          setTimeout(() => loadProducts(), 1000 * retryCount); // Exponential backoff
        } else if (mounted) {
          setAllProducts([]);
          setSearchResults([]);
        }
      }
    };
    
    loadProducts();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Refresh products when language changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const products = await productService.refreshProducts();
        if (!mounted) return;
        setAllProducts(products);
        // Re-run search with current query if any
        if (searchQuery.trim()) {
          const results = productService.searchProducts(searchQuery, i18n.language);
          setSearchResults(results);
        } else {
          setSearchResults(products.slice(0, 8));
        }
      } catch (e) {
        console.error('Failed to refresh products on language change:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [i18n.language]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const results = productService.searchProducts(searchQuery, i18n.language);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults(allProducts.slice(0, 8));
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, allProducts, i18n.language]);

  const handleAddProduct = (product: Product) => {
    onAddProduct(product, 1);
  };

  const categories = [...new Set(allProducts.map(p => p.category))];

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Product Search
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={searchQuery === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchQuery('')}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={searchQuery === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchQuery(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Search Results */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            searchResults.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{productService.getProductNameInLanguage(product, i18n.language)}</h4>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-mono font-semibold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {product.stock} in stock
                    </span>
                  </div>
                </div>

                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleAddProduct(product)}
                  disabled={product.stock === 0}
                  className="ml-2"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
            ))
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Showing {searchResults.length} product{searchResults.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}