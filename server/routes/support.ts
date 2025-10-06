import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, requireAdmin, requireModerator, AuthenticatedRequest } from '../middleware/auth';
import { sanitizeInput } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting for support endpoints
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tickets per window for regular users
  message: { error: 'Too many support requests, please try again later' }
});

// Create support ticket
router.post('/tickets', authenticateUser, supportLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { subject, message, priority = 'medium' } = sanitizeInput(req.body);

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    if (subject.length < 5 || message.length < 10) {
      return res.status(400).json({ error: 'Subject must be at least 5 characters and message at least 10 characters' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }

    const ticketData = {
      user_id: userId,
      subject: subject.trim(),
      message: message.trim(),
      priority,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert(ticketData)
      .select(`
        *,
        user:users!user_id(name, email)
      `)
      .single();

    if (error) {
      console.error('Ticket creation error:', error);
      return res.status(500).json({ error: 'Failed to create support ticket' });
    }

    // Create notification for user
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Support Ticket Created',
        message: `Your support ticket "${subject}" has been created and will be reviewed by our team.`,
        type: 'info'
      });

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at
      }
    });

  } catch (error) {
    console.error('Support ticket creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's support tickets
router.get('/tickets', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        id,
        subject,
        message,
        status,
        priority,
        admin_response,
        created_at,
        updated_at
      `)
      .eq('user_id', userId);

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1);

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Tickets fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch support tickets' });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Ticket count error:', countError);
    }

    res.json({
      tickets: tickets || [],
      pagination: {
        current_page: parseInt(page as string),
        total_pages: Math.ceil((count || 0) / parseInt(limit as string)),
        total_count: count || 0,
        has_more: offset + (tickets?.length || 0) < (count || 0)
      }
    });

  } catch (error) {
    console.error('Support tickets fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific support ticket
router.get('/tickets/:id', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        user:users!user_id(name, email),
        assigned_admin:users!assigned_to(name, email)
      `)
      .eq('id', id);

    // Regular users can only see their own tickets
    if (userRole === 'user' || userRole === 'influencer') {
      query = query.eq('user_id', userId);
    }

    const { data: ticket, error } = await query.single();

    if (error || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    res.json({ ticket });

  } catch (error) {
    console.error('Support ticket fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Moderator: Get all support tickets
router.get('/admin/tickets', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, priority, assigned_to, page = 1, limit = 20 } = req.query;

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        user:users!user_id(name, email),
        assigned_admin:users!assigned_to(name, email)
      `);

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    if (priority && typeof priority === 'string') {
      query = query.eq('priority', priority);
    }

    if (assigned_to && typeof assigned_to === 'string') {
      query = query.eq('assigned_to', assigned_to);
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1);

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Admin tickets fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch support tickets' });
    }

    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact', head: true });

    res.json({
      tickets: tickets || [],
      pagination: {
        current_page: parseInt(page as string),
        total_pages: Math.ceil((count || 0) / parseInt(limit as string)),
        total_count: count || 0
      }
    });

  } catch (error) {
    console.error('Admin support tickets fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin/Moderator: Update support ticket
router.put('/admin/tickets/:id', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { status, admin_response, assigned_to, priority } = sanitizeInput(req.body);

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      const validStatuses = ['open', 'pending', 'in_progress', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updateData.status = status;
    }

    if (admin_response) {
      updateData.admin_response = admin_response;
    }

    if (assigned_to) {
      // Verify the assigned user is admin or moderator
      const { data: assignedUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', assigned_to)
        .single();

      if (!assignedUser || (assignedUser.role !== 'admin' && assignedUser.role !== 'moderator')) {
        return res.status(400).json({ error: 'Can only assign to admin or moderator' });
      }

      updateData.assigned_to = assigned_to;
    }

    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      updateData.priority = priority;
    }

    const { data: updatedTicket, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user:users!user_id(name, email)
      `)
      .single();

    if (error) {
      console.error('Ticket update error:', error);
      return res.status(500).json({ error: 'Failed to update support ticket' });
    }

    // Create notification for ticket owner if admin responded
    if (admin_response) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: updatedTicket.user_id,
          title: 'Support Ticket Updated',
          message: `Your support ticket "${updatedTicket.subject}" has been updated with a response from our team.`,
          type: 'info',
          action_url: `/support/tickets/${updatedTicket.id}`
        });
    }

    // Log admin action
    await supabaseAdmin
      .from('content_management_logs')
      .insert({
        admin_id: adminId,
        resource_type: 'support_ticket',
        resource_id: id,
        operation_type: 'update',
        details: updateData
      });

    res.json({
      message: 'Support ticket updated successfully',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Support ticket update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get support statistics
router.get('/admin/stats', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // Get ticket counts by status
    const { data: statusStats, error: statusError } = await supabaseAdmin
      .from('support_tickets')
      .select('status')
      .then(result => {
        if (result.error) return result;
        
        const statusCounts = result.data.reduce((acc: any, ticket: any) => {
          acc[ticket.status] = (acc[ticket.status] || 0) + 1;
          return acc;
        }, {});

        return { data: statusCounts, error: null };
      });

    if (statusError) {
      console.error('Status stats error:', statusError);
      return res.status(500).json({ error: 'Failed to fetch status statistics' });
    }

    // Get priority distribution
    const { data: priorityStats, error: priorityError } = await supabaseAdmin
      .from('support_tickets')
      .select('priority')
      .then(result => {
        if (result.error) return result;
        
        const priorityCounts = result.data.reduce((acc: any, ticket: any) => {
          acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
          return acc;
        }, {});

        return { data: priorityCounts, error: null };
      });

    if (priorityError) {
      console.error('Priority stats error:', priorityError);
    }

    // Get recent tickets
    const { data: recentTickets, error: recentError } = await supabaseAdmin
      .from('support_tickets')
      .select(`
        id,
        subject,
        status,
        priority,
        created_at,
        user:users!user_id(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Recent tickets error:', recentError);
    }

    res.json({
      status_distribution: statusStats,
      priority_distribution: priorityStats,
      recent_tickets: recentTickets || []
    });

  } catch (error) {
    console.error('Support stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;