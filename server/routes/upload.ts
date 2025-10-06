import { Router } from 'express';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { ObjectStorageService, ObjectNotFoundError } from '../objectStorage';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: { error: 'Too many upload attempts, please try again later' }
});

// Serve public objects (course thumbnails, etc.)
router.get('/public-objects/*', async (req, res) => {
  const filePath = req.url.replace('/public-objects/', '');
  const objectStorageService = new ObjectStorageService();
  
  try {
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    objectStorageService.downloadObject(file, res);
  } catch (error) {
    console.error('Error searching for public object:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve protected objects (course PDFs, etc.)
router.get('/objects/*', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const objectStorageService = new ObjectStorageService();
  
  try {
    const objectFile = await objectStorageService.getObjectEntityFile(req.path);
    
    // For course content, verify user has purchased the course
    // Extract course ID from object path if this is course content
    const objectPath = req.url.replace('/objects/', '');
    
    if (objectPath.includes('courses/')) {
      const pathParts = objectPath.split('/');
      const courseIdIndex = pathParts.indexOf('courses') + 1;
      
      if (courseIdIndex < pathParts.length) {
        const courseId = pathParts[courseIdIndex];
        
        // Check if user has purchased this course
        const { data: purchase } = await supabaseAdmin
          .from('purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .eq('payment_status', 'completed')
          .single();

        if (!purchase) {
          return res.status(403).json({ error: 'Course not purchased' });
        }
      }
    }
    
    objectStorageService.downloadObject(objectFile, res);
  } catch (error) {
    console.error('Error accessing object:', error);
    if (error instanceof ObjectNotFoundError) {
      return res.sendStatus(404);
    }
    return res.sendStatus(500);
  }
});

// Get upload URL for files  
router.post('/upload-url', authenticateUser, requireAdmin, uploadLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Update course with uploaded files
router.put('/course-files', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { courseId, pdfURL, thumbnailURL } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const objectStorageService = new ObjectStorageService();
    const updateData: any = { updated_at: new Date().toISOString() };

    if (pdfURL) {
      const pdfPath = objectStorageService.normalizeObjectEntityPath(pdfURL);
      updateData.pdf_url = pdfPath;
    }

    if (thumbnailURL) {
      const thumbnailPath = objectStorageService.normalizeObjectEntityPath(thumbnailURL);
      updateData.thumbnail_url = thumbnailPath;
    }

    // Update course with file paths
    const { data: updatedCourse, error } = await supabaseAdmin
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Course update error:', error);
      return res.status(500).json({ error: 'Failed to update course files' });
    }

    res.json({
      message: 'Course files updated successfully',
      course: updatedCourse
    });

  } catch (error) {
    console.error('Course files update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;