import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Mail, 
  Building2, 
  CreditCard,
  DollarSign,
  Calendar,
  Crown,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { SubscriptionPlan, Tenant } from '@/services/api/stripeApi';

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  plans: SubscriptionPlan[];
  tenants: Tenant[];
}

const paymentMethodOptions = ['stripe', 'cash', 'upi', 'bank_transfer', 'other'] as const;

// Form validation schema
const createSubscriptionSchema = z.object({
  tenant_id: z.string()
    .min(1, 'Please select a tenant'),
  plan_id: z.string()
    .min(1, 'Please select a plan'),
  payment_method: z.enum(paymentMethodOptions),
  customer_email: z.union([
    z.string().trim().email('Please enter a valid email address'),
    z.literal('')
  ]),
  manual_payment_reference: z.string().max(120, 'Reference cannot exceed 120 characters').optional(),
  manual_payment_notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  paid_at: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.payment_method === 'stripe') {
    if (!data.customer_email || !data.customer_email.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Customer email is required for Stripe payments',
        path: ['customer_email']
      });
    }
  }
});

const getDefaultPaidAtValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

type CreateSubscriptionFormData = z.infer<typeof createSubscriptionSchema>;

const CreateSubscriptionDialog: React.FC<CreateSubscriptionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  plans,
  tenants
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateSubscriptionFormData>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      tenant_id: '',
      plan_id: '',
      customer_email: '',
      payment_method: 'stripe',
      manual_payment_reference: '',
      manual_payment_notes: '',
      paid_at: getDefaultPaidAtValue(),
    },
  });

  const handleSubmit = async (data: CreateSubscriptionFormData) => {
    try {
      setLoading(true);
      const payload: any = {
        tenant_id: data.tenant_id,
        plan_id: data.plan_id,
        payment_method: data.payment_method,
      };

      if (data.payment_method === 'stripe') {
        payload.customer_email = data.customer_email?.trim();
      } else {
        payload.manual_payment_reference = data.manual_payment_reference?.trim() || undefined;
        payload.manual_payment_notes = data.manual_payment_notes?.trim() || undefined;
        payload.paid_at = data.paid_at ? new Date(data.paid_at).toISOString() : undefined;
      }

      await onSubmit(payload);
      
      // Reset form
      form.reset({
        tenant_id: '',
        plan_id: '',
        customer_email: '',
        payment_method: 'stripe',
        manual_payment_reference: '',
        manual_payment_notes: '',
        paid_at: getDefaultPaidAtValue(),
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset({
      tenant_id: '',
      plan_id: '',
      customer_email: '',
      payment_method: 'stripe',
      manual_payment_reference: '',
      manual_payment_notes: '',
      paid_at: getDefaultPaidAtValue(),
    });
    onOpenChange(false);
  };

  // Auto-fill email when tenant is selected
  const handleTenantChange = (tenantId: string) => {
    form.setValue('tenant_id', tenantId);
    const selectedTenant = tenants.find(t => (t._id || t.id) === tenantId);
    if (selectedTenant && form.getValues('payment_method') === 'stripe') {
      form.setValue('customer_email', selectedTenant.email || '');
    } else if (form.getValues('payment_method') === 'stripe') {
      form.setValue('customer_email', '');
    }
  };

  const handlePaymentMethodChange = (method: typeof paymentMethodOptions[number]) => {
    if (method === 'stripe') {
      const tenantId = form.getValues('tenant_id');
      const selectedTenant = tenants.find(t => (t._id || t.id) === tenantId);
      form.setValue('customer_email', selectedTenant?.email || '');
    } else {
      form.setValue('customer_email', '');
      if (!form.getValues('paid_at')) {
        form.setValue('paid_at', getDefaultPaidAtValue());
      }
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const getIntervalText = (interval: string, count: number) => {
    const intervalMap = {
      month: count === 1 ? 'Monthly' : `Every ${count} months`,
      year: count === 1 ? 'Yearly' : `Every ${count} years`,
    };
    return intervalMap[interval as keyof typeof intervalMap] || interval;
  };

  const tenantId = form.watch('tenant_id');
  const planId = form.watch('plan_id');
  const paymentMethod = form.watch('payment_method');
  const isStripePayment = paymentMethod === 'stripe';
  const selectedTenant = tenants.find(t => (t._id || t.id) === tenantId);
  const selectedPlan = plans.find(p => p._id === planId);

  // Filter out tenants that might already have active subscriptions
  const availableTenants = tenants.filter(t => t.status === 'active');
  const activePlans = plans.filter(p => p.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Subscription
          </DialogTitle>
          <DialogDescription>
            Create a new subscription for a tenant organization. Use Stripe for online billing or mark offline payments as paid.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Warning about existing subscriptions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Note:</strong> Each tenant can only have one active subscription. Ensure there isn&apos;t already an active plan before proceeding.
              </AlertDescription>
            </Alert>

            {/* Tenant Selection */}
            <FormField
              control={form.control}
              name="tenant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant Organization</FormLabel>
                  <Select 
                    onValueChange={handleTenantChange} 
                    value={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tenant organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTenants.map((tenant) => (
                        <SelectItem key={tenant._id || tenant.id} value={tenant._id || tenant.id}>
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span>{tenant.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {tenant.subdomain || tenant.slug} • {tenant.email}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The organization that will be billed for this subscription
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Plan Selection */}
            <FormField
              control={form.control}
              name="plan_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Plan</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subscription plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activePlans.map((plan) => (
                        <SelectItem key={plan._id} value={plan._id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <CreditCard className="h-4 w-4" />
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <span>{plan.name}</span>
                                  {plan.is_default && (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(plan.price, plan.currency)} / {getIntervalText(plan.interval, plan.interval_count)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The subscription plan that defines pricing and features
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handlePaymentMethodChange(value as typeof paymentMethodOptions[number]);
                    }}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="stripe">
                        Stripe (Online)
                      </SelectItem>
                      <SelectItem value="cash">
                        Cash
                      </SelectItem>
                      <SelectItem value="upi">
                        UPI
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="other">
                        Other Offline Method
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose Stripe for online billing or mark the subscription as paid using an offline method.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Email */}
            {isStripePayment && (
              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="customer@example.com"
                          className="pl-10"
                          {...field} 
                          disabled={loading}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Email address for billing and subscription notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isStripePayment && (
              <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/40">
                <FormField
                  control={form.control}
                  name="manual_payment_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Reference (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="UPI txn ID, receipt, etc."
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Store a reference number or identifier for this manual payment.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manual_payment_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional context about this payment"
                          rows={3}
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Add internal notes about how this payment was verified.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paid_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid At</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local"
                          disabled={loading}
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        When the offline payment was received. Defaults to the current date/time.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Selected Tenant Info */}
            {selectedTenant && (
              <Alert className="border-blue-200 bg-blue-50">
                <Building2 className="h-4 w-4" />
                <AlertDescription className="text-blue-800">
                  <strong>Selected Tenant:</strong> {selectedTenant.name}
                  <br />
                  <span className="text-sm">
                    Subdomain: <code className="bg-blue-100 px-1 rounded">{selectedTenant.subdomain || selectedTenant.slug}</code>
                    {' • '}Status: <span className="capitalize">{selectedTenant.status}</span>
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Selected Plan Info */}
            {selectedPlan && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Selected Plan: {selectedPlan.name}</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Price</div>
                    <div className="flex items-center text-lg font-bold text-gray-900">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {formatCurrency(selectedPlan.price, selectedPlan.currency)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getIntervalText(selectedPlan.interval, selectedPlan.interval_count)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Trial Period</div>
                    <div className="flex items-center text-gray-900">
                      <Calendar className="h-4 w-4 mr-1" />
                      {selectedPlan.trial_period_days ? `${selectedPlan.trial_period_days} days` : 'No trial'}
                    </div>
                  </div>
                </div>

                {/* Plan limits */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-gray-900">{selectedPlan.max_clinics}</div>
                    <div className="text-xs text-gray-600">Max Clinics</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-gray-900">{selectedPlan.max_users}</div>
                    <div className="text-xs text-gray-600">Max Users</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-lg font-bold text-gray-900">{selectedPlan.max_patients}</div>
                    <div className="text-xs text-gray-600">Max Patients</div>
                  </div>
                </div>

                {/* Features */}
                {selectedPlan.features && selectedPlan.features.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Included Features</div>
                    <div className="space-y-1">
                      {selectedPlan.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                          {feature}
                        </div>
                      ))}
                      {selectedPlan.features.length > 3 && (
                        <div className="text-xs text-gray-500 ml-5">
                          +{selectedPlan.features.length - 3} more features
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Notice */}
            {isStripePayment ? (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-orange-800">
                  <strong>Stripe Payment Required:</strong> After creating the subscription, the tenant will need to complete payment setup through Stripe. 
                  They will receive an email with payment instructions.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Manual Payment:</strong> This subscription will be activated immediately and marked as paid using the selected offline method.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !form.formState.isValid}
                className="min-w-[180px]"
              >
                {loading 
                  ? (isStripePayment ? 'Creating...' : 'Saving...')
                  : (isStripePayment ? 'Create Subscription' : 'Mark as Paid & Activate')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSubscriptionDialog;
