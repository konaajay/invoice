import React, { useState, useEffect } from 'react';

interface ModulePricing {
    [key: string]: number;
}

interface ModuleAssignment {
    moduleName: string;
    amount: number | '';
    paymentMethod: string;
    specialRequirements: string;
    extraCharges: number | '';
}

interface AssignSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: number;
    tenantName: string;
    onSuccess: () => void;
}

export const AssignSubscriptionModal: React.FC<AssignSubscriptionModalProps> = ({ isOpen, onClose, tenantId, tenantName, onSuccess }) => {
    const [modulePricing, setModulePricing] = useState<ModulePricing>({});
    const [moduleConfigs, setModuleConfigs] = useState<Record<string, ModuleAssignment>>({});
    const [toggledModules, setToggledModules] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Fetch default module pricing
            fetch(`${import.meta.env.VITE_API_BASE}/api/subscriptions/modules/pricing`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setModulePricing(data.data);
                    }
                })
                .catch(err => console.error("Error fetching pricing", err));
        }
    }, [isOpen]);

    const handleToggle = (moduleName: string) => {
        const newSet = new Set(toggledModules);
        if (newSet.has(moduleName)) {
            newSet.delete(moduleName);
            setModuleConfigs(prev => {
                const next = { ...prev };
                delete next[moduleName];
                return next;
            });
        } else {
            newSet.add(moduleName);
            setModuleConfigs(prev => ({
                ...prev,
                [moduleName]: {
                    moduleName,
                    amount: modulePricing[moduleName] || '',
                    paymentMethod: 'Credit/Debit Card',
                    specialRequirements: '',
                    extraCharges: ''
                }
            }));
        }
        setToggledModules(newSet);
    };

    const handleConfigChange = (moduleName: string, field: keyof ModuleAssignment, value: any) => {
        setModuleConfigs(prev => ({
            ...prev,
            [moduleName]: {
                ...prev[moduleName],
                [field]: value
            }
        }));
    };

    const calculateTotal = () => {
        let total = 0;
        Object.values(moduleConfigs).forEach(config => {
            total += Number(config.amount || 0);
            total += Number(config.extraCharges || 0);
        });
        return total;
    };

    const handleSubmit = async () => {
        setLoading(true);

        const moduleAssignments = Object.values(moduleConfigs).map(config => ({
            ...config,
            amount: Number(config.amount || 0),
            extraCharges: Number(config.extraCharges || 0)
        }));

        const payload = {
            planName: "MANUAL_ASSIGNMENT",
            billingInterval: "CUSTOM",
            amount: calculateTotal(),
            amountPaid: calculateTotal(), // Set amountPaid to same as calculated unless modified
            paymentReference: "Admin Assorted Modules",
            moduleAssignments
        };

        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/subscriptions/admin/assign/${tenantId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                onSuccess();
                onClose();
            } else {
                alert("Failed to assign subscription: " + data.message);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Format module name (e.g., SUPPORT_TICKETS -> Support Tickets)
    const formatModuleName = (mod: string) => {
        return mod.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <h3 className="text-xl font-bold text-gray-900">Grant Subscription Modules: <span className="text-cyan-500">{tenantName}</span></h3>
                        </div>
                        <p className="text-sm text-gray-500">Adjust active system module clearance, license fees, and special billing arrangements.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">

                    {/* Alert */}
                    <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <svg className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p className="text-sm text-cyan-700 font-medium">Core Exemption: SYSTEM_ADMIN and EMPLOYEE roles operate as system-core functions and do not require separate module enabling.</p>
                    </div>

                    {/* Modules List */}
                    <div className="space-y-4">
                        {Object.keys(modulePricing).filter(m => m !== 'ADMIN').map((mod) => (
                            <div key={mod} className={`bg-white border ${toggledModules.has(mod) ? 'border-cyan-200 shadow-sm' : 'border-gray-200'} rounded-xl p-5 transition-all duration-200`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-base font-bold text-gray-900">{formatModuleName(mod)} Module</h4>
                                        <p className="text-xs text-gray-500 mt-1">Core capabilities and feature access for the {formatModuleName(mod)} module.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={toggledModules.has(mod)} onChange={() => handleToggle(mod)} />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                    </label>
                                </div>

                                {/* Expanded Inputs */}
                                {toggledModules.has(mod) && moduleConfigs[mod] && (
                                    <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Subscription Price</label>
                                            <input
                                                type="number"
                                                value={moduleConfigs[mod].amount}
                                                onChange={e => handleConfigChange(mod, 'amount', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500 px-3 py-2 border"
                                                placeholder="e.g. 150"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
                                            <select
                                                value={moduleConfigs[mod].paymentMethod}
                                                onChange={e => handleConfigChange(mod, 'paymentMethod', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500 px-3 py-2 border"
                                            >
                                                <option>Credit/Debit Card</option>
                                                <option>Bank Transfer</option>
                                                <option>Cash</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Special Requirements</label>
                                            <input
                                                type="text"
                                                value={moduleConfigs[mod].specialRequirements}
                                                onChange={e => handleConfigChange(mod, 'specialRequirements', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500 px-3 py-2 border"
                                                placeholder="e.g. Specific branch code"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Extra Charges</label>
                                            <input
                                                type="number"
                                                value={moduleConfigs[mod].extraCharges}
                                                onChange={e => handleConfigChange(mod, 'extraCharges', e.target.value)}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500 px-3 py-2 border"
                                                placeholder="e.g. 50"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
                    <div className="text-sm">
                        <span className="text-gray-500">Total Calculated Revenue: </span>
                        <span className="font-bold text-gray-900 text-lg">₹{calculateTotal()}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-full font-medium text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || toggledModules.size === 0}
                            className="px-6 py-2 rounded-full font-medium text-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-300 transition shadow-sm"
                        >
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
