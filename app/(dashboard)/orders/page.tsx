'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Download,
  Calendar,
  Eye,
  Settings,
  Edit2,
  History,
  PhoneCall,
  AlertCircle,
} from 'lucide-react';
import { fetchApi, formatBDT, formatDate } from '@/lib/apiClient';
import { useToast } from '@/app/providers';
import { useTranslation } from '@/lib/i18n';

// Import Shadcn components
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Input } from '@/components/ui/shadcn/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";

// Original components that might have internal state/logic that we shouldn't break
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { RiskSettingsModal } from '@/components/orders/RiskSettingsModal';
import { HoldOrderModal } from '@/components/orders/HoldOrderModal';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import { OrderInspectorModal } from '@/components/orders/OrderInspectorModal';
import { OrderStatusDropdown } from '@/components/orders/OrderStatusDropdown';

interface OrderItemDetail {
  id: string;
  product_id: string;
  quantity: number;
  sell_price: number;
  products?: {
    name: string;
    sku: string | null;
  };
}

interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  total_amount: number;
  cod_amount: number;
  delivery_charge: number;
  notes: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  courier_provider: string | null;
  courier_delivery_ratio?: number | null;
  courier_cancel_ratio?: number | null;
  courier_fraud_reports?: number;
  courier_fraud_comment?: string | null;
  created_at: string;
  order_items?: OrderItemDetail[];
}

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Transit', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [chosenCourier, setChosenCourier] = useState<string>('steadfast');

  const [riskModalOpen, setRiskModalOpen] = useState<boolean>(false);
  const [holdModalOpen, setHoldModalOpen] = useState<boolean>(false);
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [inspectorModalOpen, setInspectorModalOpen] = useState<boolean>(false);
  const [inspectorOrderId, setInspectorOrderId] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Fetch tenant courier risk rules
  const { data: riskSettings } = useQuery<{ minDeliveryRatio: number; maxCancelRatio: number }>({
    queryKey: ['courier-risk-settings'],
    queryFn: () => fetchApi('/api/v1/courier/risk-settings'),
  });

  const minDelivery = riskSettings?.minDeliveryRatio ?? 50;

  // Fetch Orders query
  const { data, isLoading } = useQuery<{
    items: OrderRecord[];
    pagination: { total: number; totalPages: number; page: number };
  }>({
    queryKey: ['orders', activeTab, search, fromDate, toDate, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeTab) params.set('status', activeTab);
      if (search) params.set('search', search);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      params.set('page', String(page));
      params.set('limit', '20');
      return fetchApi(`/api/v1/orders?${params.toString()}`);
    },
  });

  // Confirm order mutation
  const confirmMutation = useMutation({
    mutationFn: ({ orderId, courier }: { orderId: string; courier: string }) =>
      fetchApi(`/api/v1/orders/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ courier_provider: courier }),
      }),
    onSuccess: () => {
      toast('Order confirmed and booked', 'success');
      setConfirmModalOpen(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Failed to confirm', 'error');
    },
  });

  const orders: OrderRecord[] = Array.isArray(data) ? data : data?.items || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, page: 1 };

  const handleOpenInspector = (orderId: string) => {
    setInspectorOrderId(orderId);
    setInspectorModalOpen(true);
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set('status', activeTab);
      if (search) params.set('search', search);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      
      const res = await fetch(`/api/v1/export/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast(err?.message || 'Export failed', 'error');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Orders')}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and dispatch customer orders.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRiskModalOpen(true)} title="Courier Settings">
            <Settings className="w-4 h-4 mr-2" />
            {t('Settings')}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            {t('Export')}
          </Button>

          <Button size="sm" asChild>
            <Link href="/orders/new">
              <Plus className="w-4 h-4 mr-2" />
              {t('New Order')}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:px-6 sm:pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md self-start">
              {STATUS_TABS.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <Button
                    key={tab.label}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setActiveTab(tab.value);
                      setPage(1);
                    }}
                  >
                    {t(tab.label)}
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <div className="relative flex-1 w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('Search by ID or customer...')}
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-sm outline-none cursor-pointer text-foreground"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-sm outline-none cursor-pointer text-foreground"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 sm:px-6 sm:pb-6">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={8} cols={7} />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-medium text-muted-foreground">No orders found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t('Order Info')}</TableHead>
                  <TableHead>{t('Customer')}</TableHead>
                  <TableHead>{t('Address')}</TableHead>
                  <TableHead>{t('Product')}</TableHead>
                  <TableHead className="text-right">{t('Amount')}</TableHead>
                  <TableHead className="w-[160px]">{t('Status')}</TableHead>
                  <TableHead className="w-[100px] text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const hasFraud = Boolean(order.courier_fraud_comment);
                  const isRedRiskAlert = hasFraud || order.is_flagged || (order.courier_delivery_ratio && order.courier_delivery_ratio < minDelivery);
                  
                  return (
                    <TableRow key={order.id} className={isRedRiskAlert ? 'bg-destructive/5 hover:bg-destructive/10' : ''}>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          {isRedRiskAlert && <AlertCircle className="w-4 h-4 text-destructive" />}
                          <div className={`font-medium ${isRedRiskAlert ? 'text-destructive' : ''}`}>WB{order.id.slice(0, 6).toUpperCase()}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</div>
                      </TableCell>
                      
                      <TableCell className="align-top">
                        <div className={`font-medium capitalize ${isRedRiskAlert ? 'text-destructive' : ''}`}>{order.customer_name}</div>
                        <div className="text-xs font-mono text-muted-foreground mt-1">{order.customer_phone}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                            <PhoneCall className="w-3 h-3 mr-1" /> {t('Call')}
                          </Button>
                          <Badge variant="secondary" className="h-6 text-[10px] px-2 font-medium">
                            <History className="w-3 h-3 mr-1" /> 1 {t('Orders')}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className={`text-sm text-muted-foreground line-clamp-3 leading-relaxed max-w-[200px] ${isRedRiskAlert ? 'text-destructive' : ''}`}>
                          {order.customer_address}
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="space-y-1">
                           {order.order_items?.map((it, idx) => (
                             <div key={idx} className="flex justify-between gap-4 text-sm">
                               <span className={`line-clamp-1 ${isRedRiskAlert ? 'text-destructive' : ''}`}>{it.products?.name}</span>
                               <span className="text-muted-foreground font-medium whitespace-nowrap">x{it.quantity}</span>
                             </div>
                           ))}
                        </div>
                      </TableCell>

                      <TableCell className="align-top text-right">
                        <div className="font-semibold tabular-nums">
                          {formatBDT(order.total_amount)}
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className={isRedRiskAlert ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background rounded-md inline-block' : ''}>
                          <OrderStatusDropdown 
                             order={order} 
                             onDispatch={() => {
                                setSelectedOrder(order);
                                setConfirmModalOpen(true);
                             }}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="align-top text-right">
                        <div className="flex justify-end gap-1">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleOpenInspector(order.id)}>
                             <Eye className="w-4 h-4"/>
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                             <Edit2 className="w-4 h-4"/>
                           </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <span className="text-sm text-muted-foreground font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Order"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="font-medium">{selectedOrder?.customer_name}</div>
            <div className="text-sm text-muted-foreground mt-1">{selectedOrder?.customer_address}</div>
          </div>

          <Select
            label="Courier"
            value={chosenCourier}
            onChange={(e) => setChosenCourier(e.target.value)}
            options={[
              { value: 'steadfast', label: 'Steadfast Courier' },
              { value: 'pathao', label: 'Pathao Courier' },
              { value: 'redx', label: 'RedX Logistics' },
            ]}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
              Back
            </Button>
            {/* Note: In Shadcn, standard button doesn't have isLoading, but we can pass disabled */}
            <Button
              disabled={confirmMutation.isPending}
              onClick={() => {
                if (selectedOrder) {
                  confirmMutation.mutate({ orderId: selectedOrder.id, courier: chosenCourier });
                }
              }}
            >
              {confirmMutation.isPending ? 'Dispatching...' : 'Dispatch'}
            </Button>
          </div>
        </div>
      </Modal>

      <RiskSettingsModal isOpen={riskModalOpen} onClose={() => setRiskModalOpen(false)} />
      <HoldOrderModal isOpen={holdModalOpen} onClose={() => { setHoldModalOpen(false); setSelectedOrder(null); }} orderId={selectedOrder?.id || null} customerName={selectedOrder?.customer_name} totalAmount={selectedOrder?.total_amount} currentNotes={selectedOrder?.notes} />
      <CancelOrderModal isOpen={cancelModalOpen} onClose={() => { setCancelModalOpen(false); setSelectedOrder(null); }} orderId={selectedOrder?.id || null} customerName={selectedOrder?.customer_name} totalAmount={selectedOrder?.total_amount} currentNotes={selectedOrder?.notes} />
      <OrderInspectorModal isOpen={inspectorModalOpen} onClose={() => { setInspectorModalOpen(false); setInspectorOrderId(null); }} orderId={inspectorOrderId} onOpenConfirm={(order) => { setSelectedOrder(order); setConfirmModalOpen(true); }} onOpenHold={(order) => { setSelectedOrder(order); setHoldModalOpen(true); }} onOpenCancel={(order) => { setSelectedOrder(order); setCancelModalOpen(true); }} />
    </div>
  );
}
