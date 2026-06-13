import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  CheckCircle2, 
  Star, 
  X, 
  Send, 
  UploadCloud, 
  FileCheck, 
  AlertOctagon, 
  Download, 
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Clock,
  Coins
} from 'lucide-react';
import { Order } from '../types';
import { uploadFileToBucket, DbService } from '../lib/db';

interface OrdersViewProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: Order['status'], extraFields?: any) => void;
  onAddReview: (serviceId: string, rating: number) => void;
  loginUserName: string;
  loginUserPhone: string;
  onOpenPeerChat: (partnerPhone: string, partnerName: string) => void;
}

export default function OrdersView({
  orders,
  onUpdateStatus,
  onAddReview,
  loginUserName,
  loginUserPhone,
  onOpenPeerChat
}: OrdersViewProps) {
  const [activeTab, setActiveTab] = useState<'buyer' | 'hustler'>('buyer');
  
  // Deliverable action state
  const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null);
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [delivering, setDelivering] = useState(false);

  // Dispute action state
  const [disputingOrder, setDisputingOrder] = useState<Order | null>(null);
  const [disputeReasonMsg, setDisputeReasonMsg] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Review states upon order completion
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);

  const getMyOrders = () => {
    if (activeTab === 'buyer') {
      return orders.filter(o => o.buyerName === loginUserName);
    } else {
      return orders.filter(o => o.sellerName === loginUserName);
    }
  };

  const getStatusStyle = (status: Order['status'], disputed?: boolean) => {
    if (disputed) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'delivered':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusTextLabel = (status: Order['status'], disputed?: boolean) => {
    if (disputed) return 'Disputed (Locked Escrow)';
    switch (status) {
      case 'completed': return 'Completed & Released';
      case 'delivered': return 'Delivered (Awaiting Confirmation)';
      case 'in_progress': return 'Active Escrow';
      case 'cancelled': return 'Cancelled / Refunded';
      default: return 'Active';
    }
  };

  // Submit file deliverable payload (Task 8 & 16)
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryFile || !deliveringOrder) return;

    setDelivering(true);
    try {
      const fileExt = deliveryFile.name.split('.').pop() || 'zip';
      const cleanName = loginUserName.replace(/\s+/g, '');
      const storagePath = `delivery_${cleanName}_${Date.now()}.${fileExt}`;
      
      // Upload deliverable file to delivery-files bucket
      const publicUrl = await uploadFileToBucket('delivery-files', storagePath, deliveryFile);
      
      // Update order status to 'delivered' and embed deliverable url
      await onUpdateStatus(deliveringOrder.id, 'delivered', {
        deliverable_url: publicUrl,
        deliverable_filename: deliveryFile.name
      });

      alert(`Bounty task file [${deliveryFile.name}] uploaded successfully. Client notified for release clearance.`);
      setDeliveringOrder(null);
      setDeliveryFile(null);
    } catch (err) {
      console.error(err);
      alert('Error uploading contract deliverable');
    } finally {
      setDelivering(false);
    }
  };

  // Raise dispute channel
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReasonMsg.trim() || !disputingOrder) return;

    setSubmittingDispute(true);
    try {
      // Set disputed true inside the active database state
      await onUpdateStatus(disputingOrder.id, 'in_progress', {
        disputed: true,
        dispute_reason: disputeReasonMsg,
        escrow_status: 'holding'
      });
      alert(`Conflict dispute raised successfully. Lockbox GHS ${disputingOrder.price.toFixed(2)} is locked. A registrar from management will audit shortly.`);
      setDisputingOrder(null);
      setDisputeReasonMsg('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingDispute(false);
    }
  };

  const activeFilteredOrders = getMyOrders();

  return (
    <div id="orders-services-tab" className="bg-[#F7F8FA] min-h-screen pb-20 text-[#0D0D0D]">
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 id="orders-title" className="text-xl sm:text-2xl font-black text-[#0D0D0D] tracking-tight flex items-center gap-2">
            <span>Escrow Transaction Hub</span>
            <Coins className="w-5 h-5 text-[#0F6E56]" />
          </h1>
          <p className="text-sm text-[#6B7280] mt-1 font-medium">
            Keep progress aligned, coordinate deliverables via Peer Chat, or audit locks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white p-1 rounded-2xl border border-[#E5E7EB] mb-6 max-w-sm shadow-sm">
          <button 
            id="orders-buyer-tab"
            onClick={() => setActiveTab('buyer')}
            className={`flex-grow py-3 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'buyer' ? 'bg-[#0F6E56] text-white shadow' : 'text-[#6B7280]'
            }`}
          >
            My Bookings (Buying)
          </button>
          <button 
            id="orders-hustler-tab"
            onClick={() => setActiveTab('hustler')}
            className={`flex-grow py-3 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'hustler' ? 'bg-[#0F6E56] text-white shadow' : 'text-[#6B7280]'
            }`}
          >
            My Gigs (Selling)
          </button>
        </div>

        {/* Orders Feed */}
        <div className="space-y-4">
          {activeFilteredOrders.length === 0 ? (
            <div id="no-orders-alert" className="bg-white p-12 text-center rounded-3xl border border-[#E5E7EB] text-xs text-[#6B7280] shadow-sm font-medium">
              {activeTab === 'buyer' 
                ? "You haven't hired any student contractors yet! Browse catalogs to lock escrow." 
                : "No student bookings assigned to you. Standby for push notifications from campus."}
            </div>
          ) : (
            activeFilteredOrders.map((order) => {
              const isBuyer = activeTab === 'buyer';
              const partnerName = isBuyer ? order.sellerName : order.buyerName;
              
              // Find matching phone fallback from static/known lists
              const partnerPhone = '050 000 0000'; // fallback
              
              return (
                <div 
                  key={order.id} 
                  className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-slate-100 rounded-xl overflow-hidden border">
                        <img 
                          src={order.imageUrl || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150'} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#0D0D0D]">{order.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 py-0.5 text-[11px] text-[#6B7280] font-medium">
                          <span>{isBuyer ? `Student Partner: ` : `Purchased by: `} <strong>{partnerName}</strong></span>
                          <span>•</span>
                          <span>{new Date(order.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                      <span className="text-sm font-black text-[#EF9F27]">GHS {order.price.toFixed(2)}</span>
                      <span className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg border mt-1 select-none inline-block ${getStatusStyle(order.status, order.disputed)}`}>
                        {getStatusTextLabel(order.status, order.disputed)}
                      </span>
                    </div>
                  </div>

                  {/* Deliverable Download Area */}
                  {order.deliverable_url && (
                    <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                        <FileCheck className="w-4 h-4 text-indigo-600" />
                        <span className="truncate max-w-[250px]">Contract delivery loaded: {order.deliverable_filename || 'deliverable.zip'}</span>
                      </div>
                      <a 
                        href={order.deliverable_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 font-bold text-[10px] text-white px-3 py-1.5 rounded-lg uppercase tracking-wide flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Payload</span>
                      </a>
                    </div>
                  )}

                  {/* Actions container */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-mono">ID: {order.id}</p>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onOpenPeerChat('050 000 0000', partnerName)}
                        className="bg-[#0f6e56]/10 text-[#0F6E56] hover:bg-[#0f6e56]/20 px-3.5 py-2 rounded-xl text-xs font-bold leading-none flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Peer Chat</span>
                      </button>

                      {/* BUYER CONTROLS */}
                      {isBuyer && order.status === 'in_progress' && !order.disputed && (
                        <>
                          <button 
                            onClick={() => setDisputingOrder(order)}
                            className="text-red-500 hover:bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold font-body transition-all"
                          >
                            Raise Dispute
                          </button>
                          <button 
                            onClick={() => {
                              onUpdateStatus(order.id, 'completed');
                              setReviewOrder(order);
                            }}
                            className="bg-[#0F6E56] hover:bg-[#0b5441] text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition shadow-md shadow-[#0F6E56]/10 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Release & Confirm</span>
                          </button>
                        </>
                      )}

                      {/* HUSTLER (SELLER) CONTROLS */}
                      {!isBuyer && order.status === 'in_progress' && !order.disputed && (
                        <button 
                          onClick={() => setDeliveringOrder(order)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <UploadCloud className="w-4 h-4 animate-bounce" />
                          <span>Submit Deliverables</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FEEDBACK REVIEW MODAL */}
        <AnimatePresence>
          {reviewOrder && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border rounded-3xl p-6 max-w-sm w-full space-y-5 text-center"
              >
                <h3 className="font-extrabold text-sm uppercase text-[#0D0D0D]">Leave star reviews</h3>
                <p className="text-xs text-[#6B7280]">
                  Rate the service quality delivered by <strong>{reviewOrder.sellerName}</strong> to close dispute logs.
                </p>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      onClick={() => setSelectedRating(star)}
                      className="cursor-pointer hover:scale-110 active:scale-90 transition-transform"
                    >
                      <Star className={`w-8 h-8 ${star <= selectedRating ? 'fill-[#EF9F27] text-[#EF9F27]' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setReviewOrder(null)}
                    className="flex-1 bg-slate-50 border py-2.5 rounded-xl font-bold text-xs text-[#6B7280] hover:bg-slate-100"
                  >
                    Skip Feedback
                  </button>
                  <button 
                    onClick={() => {
                      if (reviewOrder.serviceId) {
                        onAddReview(reviewOrder.serviceId, selectedRating);
                      }
                      setReviewOrder(null);
                    }}
                    className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#0b5441]"
                  >
                    Publish Stars
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SUBMIT DELIVERABLES OVERLAY */}
        <AnimatePresence>
          {deliveringOrder && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border rounded-3xl p-6 max-w-sm w-full space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b">
                  <h3 className="text-sm font-extrabold uppercase text-[#0D0D0D]">Submit Task Deliverable</h3>
                  <button onClick={() => setDeliveringOrder(null)} className="text-[#6B7280]">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitDeliverable} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-gray-400 uppercase text-[9px] mb-2">Select deliverable target file</label>
                    <div className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition border-[#0F6E56]/30">
                      <input 
                        type="file" 
                        required
                        className="hidden" 
                        id="deliverable-doc-file" 
                        onChange={(e) => setDeliveryFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="deliverable-doc-file" className="cursor-pointer space-y-1">
                        <UploadCloud className="w-8 h-8 text-[#0F6E56] mx-auto animate-pulse" />
                        <span className="font-extrabold text-[11px] text-[#0F6E56] block">
                          {deliveryFile ? deliveryFile.name : 'Select File (Zip, PDF, PNG)'}
                        </span>
                        <span className="text-[9px] text-gray-400 block pb-1">Limits: maximum size 25MB</span>
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={delivering}
                    className="w-full bg-[#0F6E56] text-white py-3 rounded-2xl font-bold hover:bg-[#0b5441] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{delivering ? 'Saving contract...' : 'Upload Contract Execution'}</span>
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DISPUTE SUBMIT OVERLAY */}
        <AnimatePresence>
          {disputingOrder && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border rounded-3xl p-6 max-w-sm w-full space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-rose-100">
                  <h3 className="text-sm font-extrabold uppercase text-red-600 flex items-center gap-1.5">
                    <AlertOctagon className="w-5 h-5 text-red-600" />
                    <span>Raise Escrow Dispute</span>
                  </h3>
                  <button onClick={() => setDisputingOrder(null)} className="text-[#6B7280]">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleRaiseDispute} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-gray-400 uppercase text-[9px] mb-1">State Dispute Reason</label>
                    <textarea 
                      required 
                      rows={3} 
                      value={disputeReasonMsg} 
                      onChange={(e) => setDisputeReasonMsg(e.target.value)}
                      placeholder="List deliverable differences or communication failure details..."
                      className="w-full bg-[#F7F8FA] border py-2 px-3 rounded-xl focus:outline-none focus:border-red-500 text-[#0D0D0D] font-medium"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-bold cursor-pointer transition flex items-center justify-center gap-1"
                  >
                    <span>Lock Escrow Ledger</span>
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
