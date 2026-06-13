import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, UserCheck, Check, X, AlertOctagon, HelpCircle, Landmark, Sparkles, FolderSync, Clock } from 'lucide-react';
import { DbService } from '../lib/db';

interface AdminDashboardProps {
  onNotifyUpdate: () => void;
}

export default function AdminDashboard({ onNotifyUpdate }: AdminDashboardProps) {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingServices, setPendingServices] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState<'ids' | 'services' | 'disputes'>('ids');

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      const [users, jobs, orders] = await Promise.all([
        DbService.adminQueryPendingVerifications(),
        DbService.queryAllServicesAdmin(),
        DbService.queryAllOrdersAdmin()
      ]);

      setPendingUsers(users);
      setPendingServices(jobs.filter(s => s.status === 'pending'));
      setActiveOrders(orders);
    } catch (err) {
      console.warn('Could not pull live admin logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStudentId = async (phone: string, approve: boolean) => {
    try {
      setLoading(true);
      await DbService.adminVerifyUser(phone, approve);
      alert(approve ? `Student ${phone} verified successfully!` : `Verification discarded.`);
      await loadAdminStats();
      onNotifyUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveServiceObj = async (serviceId: string, approve: boolean) => {
    try {
      setLoading(true);
      if (approve) {
        await DbService.approveService(serviceId);
      } else {
        await DbService.rejectService(serviceId);
      }
      alert(approve ? 'Offering approved live!' : 'Service rejected.');
      await loadAdminStats();
      onNotifyUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminResolveDispute = async (orderId: string, action: 'release' | 'refund') => {
    try {
      setLoading(true);
      await DbService.adminResolveDispute(orderId, action);
      alert(action === 'release' ? 'Admin approved escrow release to the Student Talent!' : 'Bounty refunded to Buyer Lockbox.');
      await loadAdminStats();
      onNotifyUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const disputedEscrows = activeOrders.filter(o => o.disputed === true || (o.status === 'cancelled' && o.escrow_status === 'holding'));

  return (
    <div className="bg-[#F7F8FA] min-h-screen pb-20 text-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Banner with Stats */}
        <div className="bg-gradient-to-r from-[#0F6E56] to-[#043327] text-white p-6 rounded-3xl mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8"></div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">TTU Market Registrar Center</h1>
          </div>
          <p className="text-xs text-white/80 max-w-lg mb-6">
            Review security credentials, release contested escrow funds, and manage certified campus listings.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl">
              <span className="text-[10px] text-white/70 block uppercase tracking-wide">ID Backlog</span>
              <span className="text-lg font-black">{pendingUsers.length} students</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl">
              <span className="text-[10px] text-white/70 block uppercase tracking-wide">Pending Skills</span>
              <span className="text-lg font-black">{pendingServices.length} offers</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl">
              <span className="text-[10px] text-white/70 block uppercase tracking-wide">Disputes</span>
              <span className="text-lg font-black text-amber-300">{disputedEscrows.length} active</span>
            </div>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-[#E5E7EB] mb-8 max-w-md shadow-sm">
          <button 
            type="button"
            onClick={() => setActiveAdminTab('ids')}
            className={`flex-grow py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeAdminTab === 'ids' ? 'bg-[#0F6E56] text-white shadow' : 'text-[#6B7280]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>ID queue ({pendingUsers.length})</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveAdminTab('services')}
            className={`flex-grow py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeAdminTab === 'services' ? 'bg-[#0F6E56] text-white shadow' : 'text-[#6B7280]'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            <span>Service APPROVALS ({pendingServices.length})</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveAdminTab('disputes')}
            className={`flex-grow py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeAdminTab === 'disputes' ? 'bg-[#0F6E56] text-white shadow' : 'text-[#6B7280]'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Disputes ({disputedEscrows.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 bg-white border rounded-3xl space-y-3 shadow-md animate-pulse">
            <Clock className="w-8 h-8 animate-spin mx-auto text-[#0F6E56]" />
            <p className="text-xs text-[#6B7280]">Updating campus administration ledger keys...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-md p-6">
            
            {/* IDS SECTION */}
            {activeAdminTab === 'ids' && (
              <div className="space-y-6">
                <h3 className="text-sm font-extrabold uppercase text-[#0D0D0D]">Student Registration Requests</h3>
                {pendingUsers.length === 0 ? (
                  <p className="text-center py-10 text-xs text-[#6B7280] font-medium border-2 border-dashed rounded-2xl">
                    All students are fully verified! No pending ID approvals under review.
                  </p>
                ) : (
                  pendingUsers.map(student => (
                    <div key={student.phone} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="space-y-1">
                        <p className="font-extrabold text-sm text-[#0D0D0D]">{student.name}</p>
                        <p className="text-xs text-[#6B7280]">{student.department} • {student.year}</p>
                        <p className="text-[10px] font-mono select-all bg-white py-1 px-2 rounded border inline-block text-gray-500 font-bold mt-2">
                          PHONE: {student.phone}
                        </p>
                      </div>

                      {/* Display Uploaded photo link */}
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold mb-1.5">FRONT STUDENT ID IMAGE</span>
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-200 bg-black">
                          <img 
                            src={student.student_id_image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400'} 
                            className="w-full h-full object-cover select-none" 
                            alt="Front ID snapshot" 
                          />
                        </div>
                      </div>

                      <div className="flex flex-col justify-center gap-2">
                        <button 
                          onClick={() => handleVerifyStudentId(student.phone, true)}
                          className="w-full bg-[#0F6E56] text-white py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-[#0b5441] shadow shadow-[#0F6E56]/10"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Verify</span>
                        </button>
                        <button 
                          onClick={() => handleVerifyStudentId(student.phone, false)}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Discard ID File</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SERVICE APPROVALS */}
            {activeAdminTab === 'services' && (
              <div className="space-y-6">
                <h3 className="text-sm font-extrabold uppercase text-[#0D0D0D]">Pending Skill Approvals</h3>
                {pendingServices.length === 0 ? (
                  <p className="text-center py-10 text-xs text-[#6B7280] font-medium border-2 border-dashed rounded-2xl">
                    All created service listings are reviewed and approveed.
                  </p>
                ) : (
                  pendingServices.map(service => (
                    <div key={service.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-[#0F6E56]/10 text-[#0F6E56] font-bold px-2 py-0.5 rounded border border-[#0F6E56]/20">
                            {service.category}
                          </span>
                          <span className="text-xs font-bold text-amber-500">PENDING APPROVED</span>
                        </div>
                        <h4 className="font-extrabold text-[#0D0D0D] text-sm">{service.title}</h4>
                        <p className="text-xs text-[#6B7280] line-clamp-3">{service.description}</p>
                        <p className="text-sm font-bold text-[#0F6E56]">Price: GHS {service.price}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold mb-1.5">COVER PREVIEW</span>
                        <div className="w-full h-32 rounded-xl overflow-hidden border bg-gray-200">
                          <img 
                            src={service.image_url} 
                            className="w-full h-full object-cover" 
                            alt="Listed graphics preview" 
                          />
                        </div>
                      </div>

                      <div className="flex flex-col justify-center gap-2">
                        <button 
                          onClick={() => handleApproveServiceObj(service.id, true)}
                          className="w-full bg-[#0F6E56] text-white py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-[#0b5441]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve Catalog Offer</span>
                        </button>
                        <button 
                          onClick={() => handleApproveServiceObj(service.id, false)}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject Portfolio</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* DISPUTES RESOLUTIONS */}
            {activeAdminTab === 'disputes' && (
              <div className="space-y-6">
                <h3 className="text-sm font-extrabold uppercase text-[#0D0D0D]">Escrow Disputed Lockboxes</h3>
                {disputedEscrows.length === 0 ? (
                  <p className="text-center py-10 text-xs text-[#6B7280] font-medium border-2 border-dashed rounded-2xl">
                    No open disputes or pending escrow refunds at this hour.
                  </p>
                ) : (
                  disputedEscrows.map(order => (
                    <div key={order.id} className="p-5 border border-amber-500/20 bg-amber-500/5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-3">
                        <div>
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded mr-2 uppercase">
                            Disputed Contract
                          </span>
                          <strong className="text-sm text-[#0D0D0D]">{order.title}</strong>
                        </div>
                        <span className="text-sm font-black text-[#0F6E56]">GHS {parseFloat(order.price || 0).toFixed(2)}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 text-slate-600">
                          <p>• Student contractor (Seller): <strong className="text-[#0D0D0D]">{order.seller_name}</strong></p>
                          <p>• Client student (Buyer): <strong className="text-[#0D0D0D]">{order.buyer_name}</strong></p>
                          <p>• Escrow balance: <strong className="text-[#0D0D0D]">GHS {order.price} HOLDING</strong></p>
                        </div>
                        <div className="bg-white border rounded-xl p-3 flex flex-col justify-center">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">REASON ALIGNED BY CLIENT:</span>
                          <span className="font-semibold text-red-600 block leading-relaxed mt-1 text-[11px]">
                            "{order.dispute_reason || 'Deliverables not according to guidelines requested.'}"
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                          onClick={() => handleAdminResolveDispute(order.id, 'release')}
                          className="bg-[#0F6E56] text-white py-2.5 rounded-xl font-bold text-xs uppercase hover:bg-[#0b5441] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Landmark className="w-3.5 h-3.5" />
                          <span>Release to Seller</span>
                        </button>
                        <button 
                          onClick={() => handleAdminResolveDispute(order.id, 'refund')}
                          className="bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <landmarking className="w-3.5 h-3.5" />
                          <span>Refund Escrow to Buyer</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
