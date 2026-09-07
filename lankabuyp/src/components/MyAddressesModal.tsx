import React, { useState } from 'react';
import { X, MapPin, Plus, Trash2, Edit2, CheckCircle, Home, Briefcase, Tag, Globe, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAddress } from '../types';
import { SRI_LANKA_PROVINCES, getProvinceForDistrict } from '../lib/sriLankaAddressData';

interface MyAddressesModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: UserAddress[];
  onSaveAddress: (address: UserAddress) => Promise<void>;
  onDeleteAddress: (addressId: string) => Promise<void>;
  onSelectAddress?: (address: UserAddress) => void;
  selectedAddressId?: string;
}

export const MyAddressesModal: React.FC<MyAddressesModalProps> = ({
  isOpen,
  onClose,
  addresses,
  onSaveAddress,
  onDeleteAddress,
  onSelectAddress,
  selectedAddressId,
}) => {
  if (!isOpen) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Sri Lanka');
  const [province, setProvince] = useState('Western Province');
  const [district, setDistrict] = useState('Colombo');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setLabel('Home');
    setFullName('');
    setPhone('');
    setCountry('Sri Lanka');
    setProvince('Western Province');
    setDistrict('Colombo');
    setCity('');
    setStreet('');
    setIsDefault(false);
    setEditingId(null);
    setIsEditing(false);
  };

  const handleProvinceSelect = (provName: string) => {
    setProvince(provName);
    const p = SRI_LANKA_PROVINCES.find(x => x.nameEn === provName);
    if (p && p.districts.length > 0) {
      setDistrict(p.districts[0]);
    }
  };

  const handleStartAdd = () => {
    resetForm();
    if (addresses.length === 0) {
      setIsDefault(true);
    }
    setIsEditing(true);
  };

  const handleStartEdit = (addr: UserAddress) => {
    setEditingId(addr.id);
    setLabel((addr.label as any) || 'Home');
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setStreet(addr.street);
    setCity(addr.city);
    const calculatedProvince = getProvinceForDistrict(addr.district);
    setProvince(calculatedProvince);
    setDistrict(addr.district);
    setIsDefault(!!addr.isDefault);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !street || !city) return;

    setLoading(true);
    try {
      const newAddress: UserAddress = {
        id: editingId || `addr-${Date.now()}`,
        userId: addresses[0]?.userId || 'user-current',
        label,
        fullName,
        phone,
        street,
        city,
        district,
        isDefault: isDefault || addresses.length === 0,
        createdAt: new Date().toISOString(),
      };

      await onSaveAddress(newAddress);
      resetForm();
    } catch (err) {
      console.error('Error saving address:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentProvinceObject = SRI_LANKA_PROVINCES.find(p => p.nameEn === province) || SRI_LANKA_PROVINCES[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">My Shipping Addresses</h3>
              <p className="text-[11px] text-slate-400">Manage saved islandwide delivery locations</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {isEditing ? (
            /* Address Form */
            <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-sm text-slate-800 flex items-center justify-between">
                <span>{editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Cancel
                </button>
              </h4>

              {/* Tag Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Address Label</label>
                <div className="flex space-x-2">
                  {(['Home', 'Work', 'Other'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setLabel(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer border ${
                        label === tag
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {tag === 'Home' && <Home className="w-3.5 h-3.5" />}
                      {tag === 'Work' && <Briefcase className="w-3.5 h-3.5" />}
                      {tag === 'Other' && <Tag className="w-3.5 h-3.5" />}
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Country */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center mb-1">
                    <Globe className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <span>Country *</span>
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
                  </select>
                </div>

                {/* Province */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Province *
                  </label>
                  <select
                    value={province}
                    onChange={(e) => handleProvinceSelect(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {SRI_LANKA_PROVINCES.map((p) => (
                      <option key={p.nameEn} value={p.nameEn}>
                        {p.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    District *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {currentProvinceObject.districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">City / Town *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Nugegoda / Kegalle / Kandy"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                {/* Home Street Address */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Home Address / Street *</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. No. 45, Temple Road"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                {/* Recipient Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Full Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Kalhara"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="isDefault" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Set as my primary default delivery address
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-orange-500/20"
              >
                {loading ? 'Saving Address...' : editingId ? 'Update Address' : 'Save New Address'}
              </button>
            </form>
          ) : (
            /* Address List */
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {addresses.length} saved address{addresses.length === 1 ? '' : 'es'}
                </span>
                <button
                  onClick={handleStartAdd}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
                  <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-bold">No saved addresses found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Add a default shipping address to speed up checkout.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => onSelectAddress && onSelectAddress(addr)}
                        className={`p-4 rounded-xl border transition cursor-pointer relative ${
                          isSelected
                            ? 'bg-orange-50/60 border-orange-500 ring-1 ring-orange-500'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] uppercase font-mono">
                              {addr.label}
                            </span>
                            {addr.isDefault && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Default
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleStartEdit(addr)}
                              className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                              title="Edit address"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteAddress(addr.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                              title="Delete address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 text-xs space-y-0.5">
                          <p className="font-bold text-slate-900">{addr.fullName}</p>
                          <p className="text-slate-600">{addr.street}</p>
                          <p className="text-slate-600">
                            {addr.city}, {addr.district} District
                          </p>
                          <p className="text-slate-500 font-mono text-[11px] pt-1">📞 {addr.phone}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
