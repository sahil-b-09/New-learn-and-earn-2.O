
import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

const upiSchema = z.object({
  method_type: z.literal('UPI'),
  upi_id: z.string().min(3, 'UPI ID is required').regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/i, 'Invalid UPI ID format'),
  is_default: z.boolean().default(true),
});

const bankSchema = z.object({
  method_type: z.literal('BANK'),
  account_number: z.string().min(5, 'Account number is required'),
  ifsc_code: z.string().min(5, 'IFSC code is required').regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
  is_default: z.boolean().default(true),
});

const formSchema = z.discriminatedUnion('method_type', [upiSchema, bankSchema]);

type FormValues = z.infer<typeof formSchema>;

const PayoutMethodForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      method_type: 'UPI',
      is_default: true,
    },
  });

  const methodType = form.watch('method_type');

  const onSubmit = async (data: FormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Insert the payout method
      const { error } = await supabase.from('payout_methods').insert({
        user_id: user.id,
        method_type: data.method_type,
        upi_id: data.method_type === 'UPI' ? data.upi_id : null,
        account_number: data.method_type === 'BANK' ? data.account_number : null,
        ifsc_code: data.method_type === 'BANK' ? data.ifsc_code : null,
        is_default: data.is_default,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payout method has been added successfully',
      });

      // Reset form
      form.reset({
        method_type: 'UPI',
        is_default: true,
      });

      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding payout method:', error);
      toast({
        title: 'Error',
        description: 'Failed to add payout method. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="method_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Payout Method</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="UPI" id="upi" />
                    <label htmlFor="upi" className="font-medium cursor-pointer">UPI</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BANK" id="bank" />
                    <label htmlFor="bank" className="font-medium cursor-pointer">Bank Account</label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {methodType === 'UPI' && (
          <FormField
            control={form.control}
            name="upi_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UPI ID</FormLabel>
                <FormControl>
                  <Input placeholder="yourname@upi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {methodType === 'BANK' && (
          <>
            <FormField
              control={form.control}
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ifsc_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFSC Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SBIN0001234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#00C853] hover:bg-[#00B248] w-full mt-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Payout Method'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default PayoutMethodForm;
