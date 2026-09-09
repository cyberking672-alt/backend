import React, { useEffect, useState } from 'react';
import { 
  X, 
  Star, 
  Truck, 
  ShieldCheck, 
  ShoppingBag, 
  Zap, 
  CheckCircle2,
  MapPin,
  RotateCcw
} from 'lucide-react';
import { Product, DEFAULT_PRODUCT_IMAGE } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [selectedImage, setSelectedImage] = useState(DEFAULT_PRODUCT_IMAGE);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs'>('overview');

  useEffect(() => {
    if (!product) return;
    const firstImage = product.galleryImages?.[0] || product.imageUrl || DEFAULT_PRODUCT_IMAGE;
    setSelectedImage(firstImage);
    setQuantity(1);
    setActiveTab('overview');
  }, [product]);

  if (!product) return null;

  const rawGallery = product.galleryImages && product.galleryImages.length > 0
    ? [...product.galleryImages]
    : [product.imageUrl || DEFAULT_PRODUCT_IMAGE];

  // Deduplicate gallery images by stripping query params
  const gallery = Array.from(
    new Map(rawGallery.map(url => [url.split('?')[0].toLowerCase(), url])).values()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
              LankaBuy Verified Direct
            </span>
            <span className="text-xs text-slate-400 font-mono">
              SKU: {product.sku}
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Details Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Gallery */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 mb-3 shadow-inner">
              <img
                src={selectedImage || DEFAULT_PRODUCT_IMAGE}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnails */}
            {gallery && gallery.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-1">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                      selectedImage === img ? 'border-orange-500 shadow-md shadow-orange-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={img || DEFAULT_PRODUCT_IMAGE} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Islandwide Fulfillment Trust Box */}
            <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center text-slate-800 font-semibold">
                <ShieldCheck className="w-4 h-4 text-orange-500 mr-2" />
                <span>100% Genuine Inspected Quality</span>
              </div>
              <div className="flex items-center text-slate-600">
                <Truck className="w-4 h-4 text-emerald-600 mr-2" />
                <span>Logistics: LankaBuy Express ({product.estimatedDeliveryDays} - 4 Days Islandwide)</span>
              </div>
              <div className="flex items-center text-slate-600">
                <RotateCcw className="w-4 h-4 text-slate-500 mr-2" />
                <span>Returns: 7 Days Easy Inspection &amp; Exchange Warranty</span>
              </div>
            </div>
          </div>

          {/* Right: Info, Price, Specs & Actions */}
          <div className="flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                {product.title}
              </h2>

              {/* Rating & Sold count */}
              <div className="flex items-center space-x-2 my-3 text-xs">
                <div className="flex items-center text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-current mr-1" />
                  <span>{product.rating ?? 4.8} / 5.0</span>
                </div>
                <span className="text-slate-500">({product.reviewsCount ?? 12} customer reviews)</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700 font-semibold">{(product.soldCount ?? 0).toLocaleString()} delivered in Sri Lanka</span>
              </div>

              {/* Price Banner */}
              <div className="my-3 p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl flex items-baseline justify-between">
                <div>
                  <div className="flex items-baseline space-x-3">
                    <span className="text-2xl font-black text-slate-950">
                      Rs. {(product.price ?? 0).toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      Rs. {(product.originalPrice ?? product.price ?? 0).toLocaleString()}
                    </span>
                    {product.discountPercentage > 0 && (
                      <span className="text-xs bg-orange-500 text-white font-bold px-2 py-0.5 rounded-md">
                        Save {product.discountPercentage}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 font-medium">
                    {product.source === 'cj_dropshipping' || product.isLocalStore === false || product.id?.startsWith('global-cj') || product.allowCOD === false
                      ? '💳 Online Card Payment Only (COD not available for overseas items)'
                      : 'Supports Cash on Delivery (COD), LankaQR & Credit Cards'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2.5 py-1 rounded-full">
                    In Stock ({product.stock} units)
                  </span>
                </div>
              </div>

              {/* Tabs: Overview, Specs */}
              <div className="border-b border-slate-200 mt-4 mb-3 flex space-x-4 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 border-b-2 transition cursor-pointer ${
                    activeTab === 'overview'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Product Overview
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`pb-2 border-b-2 transition cursor-pointer ${
                    activeTab === 'specs'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Specifications
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' ? (
                <div className="text-xs text-slate-600 space-y-2">
                  <p className="leading-relaxed">{product.description}</p>
                  <div className="space-y-1.5 pt-1">
                    {product.features.map((feat, i) => (
                      <div key={i} className="flex items-start">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-slate-200/60 last:border-0">
                      <span className="text-slate-500">{key}:</span>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions: Quantity + Add to Cart & Buy Now */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-xs font-bold text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-bold text-slate-800 font-mono">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Total: <strong className="text-slate-900">Rs. {((product.price ?? 0) * quantity).toLocaleString()}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onAddToCart(product, quantity);
                    onClose();
                  }}
                  className="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/90 font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center cursor-pointer active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Add to Cart
                </button>

                <button
                  onClick={() => {
                    onBuyNow(product, quantity);
                    onClose();
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black py-3 px-4 rounded-xl text-xs transition flex items-center justify-center cursor-pointer shadow-md shadow-orange-500/25 active:scale-98"
                >
                  <Zap className="w-4 h-4 mr-2 fill-current" />
                  Instant Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
