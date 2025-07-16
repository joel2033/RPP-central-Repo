const { db } = require('./server/db');
const { contentItems } = require('./shared/schema');

async function testContentItems() {
  console.log('Testing content items schema...');

  try {
    // Test create content item
    const testItem = {
      jobCardId: 1,
      category: 'photography',
      name: '#00123 Images ON',
      description: 'Test photography content item',
      status: 'draft',
      fileCount: 5,
      s3Urls: ['test-url-1', 'test-url-2'],
      createdBy: 'test-user-id',
      updatedBy: 'test-user-id'
    };

    const [createdItem] = await db.insert(contentItems).values(testItem).returning();
    console.log('✓ Created content item:', createdItem);

    // Test update content item
    const updatedItem = await db.update(contentItems)
      .set({ 
        status: 'ready_for_qc',
        fileCount: 8,
        s3Urls: ['test-url-1', 'test-url-2', 'test-url-3']
      })
      .where(contentItems.id = createdItem.id)
      .returning();

    console.log('✓ Updated content item:', updatedItem);

    // Test select content items
    const allItems = await db.select().from(contentItems);
    console.log('✓ All content items:', allItems);

    // Test delete content item
    await db.delete(contentItems).where(contentItems.id = createdItem.id);
    console.log('✓ Deleted content item');

    console.log('Content items schema test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing content items:', error);
  }
}

testContentItems().catch(console.error);