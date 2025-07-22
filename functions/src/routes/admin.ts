import express from 'express';
import * as admin from 'firebase-admin';

const router = express.Router();
const db = admin.firestore();

// Get admin statistics
router.get('/stats', async (req, res) => {
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Get active users (processed in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsersSnapshot = await db.collection('users')
      .where('lastProcessedTimestamp', '>', thirtyDaysAgo)
      .get();
    const activeUsers = activeUsersSnapshot.size;
    
    // Get all invoices
    const invoicesSnapshot = await db.collection('invoices').get();
    const totalInvoices = invoicesSnapshot.size;
    
    // Calculate total amount
    let totalAmount = 0;
    invoicesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.amount && typeof data.amount === 'number') {
        totalAmount += data.amount;
      }
    });
    
    // Calculate averages
    const averageInvoicesPerUser = totalUsers > 0 ? totalInvoices / totalUsers : 0;
    const averageAmountPerUser = totalUsers > 0 ? totalAmount / totalUsers : 0;
    
    res.json({
      totalUsers,
      activeUsers,
      totalInvoices,
      totalAmount,
      averageInvoicesPerUser,
      averageAmountPerUser
    });
    
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get admin stats' });
  }
});

// Get all users with their stats
router.get('/users', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Get user's invoice count and total amount
      const invoicesSnapshot = await db.collection('invoices')
        .where('userId', '==', userDoc.id)
        .get();
      
      let totalAmount = 0;
      invoicesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.amount && typeof data.amount === 'number') {
          totalAmount += data.amount;
        }
      });
      
      users.push({
        uid: userDoc.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        createdAt: userData.createdAt?.toDate(),
        lastProcessedTimestamp: userData.lastProcessedTimestamp?.toDate(),
        invoiceCount: invoicesSnapshot.size,
        totalAmount
      });
    }
    
    // Sort by total amount descending
    users.sort((a, b) => b.totalAmount - a.totalAmount);
    
    res.json({ users });
    
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get processing logs
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const logsSnapshot = await db.collection('processing_logs')
      .orderBy('startTime', 'desc')
      .limit(limit)
      .get();
    
    const logs = [];
    
    for (const logDoc of logsSnapshot.docs) {
      const logData = logDoc.data();
      
      // Get user email
      const userDoc = await db.collection('users').doc(logData.userId).get();
      const userEmail = userDoc.exists ? userDoc.data()?.email : 'Unknown';
      
      logs.push({
        id: logDoc.id,
        userId: logData.userId,
        userEmail,
        emailsScanned: logData.emailsScanned,
        attachmentsProcessed: logData.attachmentsProcessed,
        invoicesFound: logData.invoicesFound,
        errors: logData.errors || [],
        startTime: logData.startTime?.toDate(),
        endTime: logData.endTime?.toDate(),
        triggerType: logData.triggerType
      });
    }
    
    res.json({ logs });
    
  } catch (error) {
    console.error('Error getting processing logs:', error);
    res.status(500).json({ error: 'Failed to get processing logs' });
  }
});

// Get user for impersonation (includes access token)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    
    res.json({ 
      user: {
        uid: userDoc.id,
        email: userData?.email,
        name: userData?.name,
        picture: userData?.picture,
        accessToken: userData?.accessToken,
        refreshToken: userData?.refreshToken,
        createdAt: userData?.createdAt?.toDate(),
        updatedAt: userData?.updatedAt?.toDate()
      }
    });

  } catch (error) {
    console.error('Error getting user for impersonation:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router; 