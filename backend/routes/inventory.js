// routes/inventory.js
const express = require('express');
const router = express.Router();
const InventoryItem = require('../models/InventoryItem');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apply authentication to all inventory routes
router.use(authenticateToken);

// Only admin, accountant, and holder-of-goods can access inventory
router.use(authorizeRoles('super-admin', 'admin', 'accountant', 'holder-of-goods'));

// Debug middleware for this router
router.use((req, res, next) => {
  console.log(`Inventory route: ${req.method} ${req.originalUrl}`);
  next();
});

// GET /api/inventory - Get all inventory items with stats
router.get('/', async (req, res) => {
    try {
        console.log('📦 Fetching all inventory items');
        const items = await InventoryItem.find().sort({ _id: -1 }); // Use _id instead of dateAdded

        console.log(`📦 Found ${items.length} inventory items in database`);
        if (items.length > 0) {
            console.log('📦 Sample item:', {
                id: items[0]._id,
                name: items[0].name,
                quantity: items[0].quantity,
                donorName: items[0].donorName
            });
        }

        const totalItems = items.length;
        const lowStock = items.filter(item => item.quantity <= (item.lowStockThreshold || 5)).length;
        const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        res.json({
            success: true,
            items,
            totalItems,
            lowStock,
            totalValue
        });
    } catch (error) {
        console.error('❌ Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching inventory'
        });
    }
});

// POST /api/inventory/item - Add new inventory item
router.post('/item', async (req, res) => {
    try {
        console.log('Adding new inventory item:', req.body);
        const itemData = {
            name: req.body.name?.trim(),
            category: req.body.category,
            quantity: Math.max(0, parseInt(req.body.quantity) || 0),
            price: Math.max(0, parseFloat(req.body.price) || 0),
            lowStockThreshold: Math.max(1, parseInt(req.body.lowStockThreshold) || 5),
            note: req.body.note?.trim()
        };

        // Add donor information if provided
        if (req.body.donorId) {
            itemData.donorId = req.body.donorId;
        }
        if (req.body.donorName) {
            itemData.donorName = req.body.donorName;
        }

        if (!itemData.name) {
            return res.status(400).json({
                success: false,
                error: 'Item name is required'
            });
        }

        const newItem = new InventoryItem(itemData);
        await newItem.save();

        // If donor is a member, create a member contribution record
        if (itemData.donorId && itemData.quantity > 0) {
            try {
                const MemberContribution = require('../models/MemberContribution');
                const contributionData = {
                    memberId: itemData.donorId,
                    type: 'in-kind',
                    category: 'donation',
                    amount: itemData.quantity * itemData.price,
                    description: `Donated ${itemData.quantity} ${itemData.name}`,
                    date: new Date(),
                    inventoryItemId: newItem._id
                };
                
                const contribution = new MemberContribution(contributionData);
                await contribution.save();
                console.log('Member contribution created for item donation');
            } catch (contribError) {
                console.error('Error creating member contribution:', contribError);
                // Don't fail the item creation if contribution fails
            }
        }

        res.json({
            success: true,
            message: 'Item added successfully',
            item: newItem
        });
    } catch (error) {
        console.error('Error saving inventory item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save item'
        });
    }
});

// PUT /api/inventory/item/:id - Update inventory item
router.put('/item/:id', async (req, res) => {
    try {
        console.log('Updating inventory item:', req.params.id, req.body);
        const itemId = req.params.id;

        const updateData = {
            ...req.body,
            quantity: Math.max(0, parseInt(req.body.quantity) || 0),
            price: Math.max(0, parseFloat(req.body.price) || 0),
            lowStockThreshold: Math.max(1, parseInt(req.body.lowStockThreshold) || 5)
        };

        const updatedItem = await InventoryItem.findByIdAndUpdate(
            itemId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }

        res.json({
            success: true,
            message: 'Item updated successfully',
            item: updatedItem
        });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update item'
        });
    }
});

// DELETE /api/inventory/item/:id - Delete inventory item
router.delete('/item/:id', async (req, res) => {
  try {
    console.log('Deleting inventory item:', req.params.id);
    const deletedItem = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete item' });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Inventory routes are working!' });
});

// GET /api/inventory/donor/:memberId - Get all inventory items donated by a specific member
router.get('/donor/:memberId', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    console.log('Fetching inventory items for donor:', memberId);
    
    // Find all items where the donorId matches
    const items = await InventoryItem.find({
      donorId: memberId
    }).sort({ _id: -1 }); // Use _id instead of dateAdded
    
    // Calculate total value of items donated by this member
    const totalValue = items.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    res.json({
      success: true,
      items,
      totalItems: items.length,
      totalValue
    });
  } catch (error) {
    console.error('Error fetching inventory items by donor:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching inventory items'
    });
  }
});

// POST /api/inventory/item/:id/donate - Record donation to inventory
router.post('/item/:id/donate', async (req, res) => {
  try {
    const { donorId, donorName, quantity, estimatedValue, notes, category = 'donation', createContribution = true } = req.body;
    
    if (!quantity || !estimatedValue || quantity <= 0 || estimatedValue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity and estimated value are required'
      });
    }

    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    // Create member contribution record if donor is specified
    let contributionId = null;
    if (createContribution && donorId) {
      try {
        const MemberContribution = require('../models/MemberContribution');
        
        const contribution = new MemberContribution({
          memberId: donorId,
          type: 'in-kind',
          category: category,
          description: `${item.name} donation (${quantity} units)`,
          quantity: parseFloat(quantity),
          value: parseFloat(estimatedValue),
          date: new Date(),
          notes: notes || `Inventory donation: ${item.name}`
        });

        await contribution.save();
        contributionId = contribution._id;
        
        console.log(`Member contribution created: ${contribution._id}`);
      } catch (error) {
        console.warn('Could not create member contribution:', error.message);
      }
    }

    // Add donation record to inventory
    const donation = {
      donorId: donorId || null,
      donorName: donorName || 'Anonymous',
      quantity: parseFloat(quantity),
      estimatedValue: parseFloat(estimatedValue),
      date: new Date(),
      contributionId: contributionId,
      notes: notes || ''
    };

    item.donations.push(donation);
    item.quantity += parseFloat(quantity);
    
    await item.save();

    console.log(`Donation recorded: ${quantity} ${item.name} worth $${estimatedValue} from ${donorName}`);

    res.json({
      success: true,
      message: 'Donation recorded successfully',
      item: item,
      donation: donation,
      contributionId: contributionId
    });

  } catch (error) {
    console.error('Error recording donation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record donation'
    });
  }
});

// POST /api/inventory/item/:id/consume - Record consumption from inventory
router.post('/item/:id/consume', async (req, res) => {
  try {
    const { quantity, purpose, notes, category = 'supplies', createTransaction = true } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      });
    }

    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    if (item.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `Insufficient quantity. Available: ${item.quantity}, Requested: ${quantity}`
      });
    }

    // Calculate value of consumed items (FIFO - First In, First Out)
    let remainingToConsume = parseFloat(quantity);
    let totalConsumedValue = 0;
    
    // Calculate average value per unit from donations
    const totalDonatedQuantity = item.donations.reduce((sum, donation) => sum + donation.quantity, 0);
    let avgValuePerUnit = 0;
    
    if (totalDonatedQuantity > 0) {
      avgValuePerUnit = item.totalDonatedValue / totalDonatedQuantity;
    } else {
      avgValuePerUnit = item.price || 0;
    }
    
    totalConsumedValue = remainingToConsume * avgValuePerUnit;

    // Create accounting transaction for the consumption
    let transactionId = null;
    if (createTransaction && totalConsumedValue > 0) {
      try {
        const Transaction = require('../models/Transaction');
        
        const transaction = new Transaction({
          type: 'expense',
          amount: totalConsumedValue,
          description: `${item.name} consumed (${quantity} units) - ${purpose}`,
          category: category,
          paymentMethod: 'non-cash', // Since this is consumption of donated items
          reference: `INV-${item._id.toString().slice(-6)}`,
          date: new Date(),
          notes: notes || `Inventory consumption: ${item.name}`,
          payee: {
            type: 'other',
            name: 'Church Operations',
            description: purpose || 'General use'
          }
        });

        await transaction.save();
        transactionId = transaction._id;
        
        console.log(`Expense transaction created: ${transaction._id} for $${totalConsumedValue}`);
      } catch (error) {
        console.warn('Could not create expense transaction:', error.message);
      }
    }

    // Record consumption in inventory
    const consumption = {
      quantity: parseFloat(quantity),
      value: totalConsumedValue,
      date: new Date(),
      purpose: purpose || 'General use',
      transactionId: transactionId,
      consumedBy: req.user.id,
      notes: notes || ''
    };

    item.consumption.push(consumption);
    item.quantity -= parseFloat(quantity);
    
    await item.save();

    console.log(`Consumption recorded: ${quantity} ${item.name} worth $${totalConsumedValue.toFixed(2)} for ${purpose}`);

    res.json({
      success: true,
      message: 'Consumption recorded successfully',
      item: item,
      consumption: consumption,
      expenseValue: totalConsumedValue,
      transactionId: transactionId
    });

  } catch (error) {
    console.error('Error recording consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record consumption'
    });
  }
});

// GET /api/inventory/item/:id/history - Get donation and consumption history
router.get('/item/:id/history', async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate('donations.donorId', 'firstName lastName email')
      .populate('consumption.consumedBy', 'name email');
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      item: {
        name: item.name,
        category: item.category,
        currentQuantity: item.quantity,
        currentValue: item.currentValue
      },
      donations: item.donations,
      consumption: item.consumption,
      summary: {
        totalDonatedValue: item.totalDonatedValue,
        totalConsumedValue: item.totalConsumedValue,
        currentValue: item.currentValue
      }
    });

  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item history'
    });
  }
});

console.log('Inventory routes loaded successfully');
module.exports = router;