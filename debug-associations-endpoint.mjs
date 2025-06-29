// Quick P0 diagnosis endpoint - Add this to any route file temporarily
router.get('/debug-associations', async (req, res) => {
  try {
    console.log('🔍 DEBUGGING ASSOCIATIONS ON PRODUCTION...');
    
    // Test our new model imports
    const { getCartItem, getStorefrontItem } = await import('../models/index.mjs');
    const CartItem = await getCartItem();
    const StorefrontItem = await getStorefrontItem();
    
    const hasAssociation = !!CartItem.associations?.storefrontItem;
    
    console.log('Association status:', {
      hasCartItemAssociations: hasAssociation,
      associationCount: Object.keys(CartItem.associations || {}).length,
      storefrontAssociation: CartItem.associations?.storefrontItem?.as
    });
    
    res.json({
      success: true,
      hasAssociation,
      associationAlias: CartItem.associations?.storefrontItem?.as,
      message: hasAssociation ? 'P0 fix working' : 'P0 fix failed'
    });
    
  } catch (error) {
    console.error('Debug associations error:', error);
    res.status(500).json({ error: error.message });
  }
});
