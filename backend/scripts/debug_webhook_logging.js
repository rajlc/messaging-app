/**
 * Real-time webhook monitor
 * This will log ALL incoming webhooks to help debug
 */

// Add this temporarily to your webhooks.controller.ts handleMetaWebhook method
// Right at the start (line 34-36)

console.log('='.repeat(80));
console.log('📥 WEBHOOK RECEIVED AT:', new Date().toISOString());
console.log('Full webhook body:');
console.log(JSON.stringify(body, null, 2));
console.log('='.repeat(80));

// Check if it's a page event
if (body.object === 'page') {
    console.log('✅ Page event detected');

    body.entry.forEach((entry, index) => {
        console.log(`\n📋 Processing Entry ${index + 1}:`);
        console.log('  - Page ID:', entry.id);
        console.log('  - Has messaging?', !!entry.messaging);
        console.log('  - Has changes?', !!entry.changes);

        if (entry.messaging) {
            console.log('  ✉️ MESSAGING EVENTS:', entry.messaging.length);
        }

        if (entry.changes) {
            console.log('  🔄 CHANGE EVENTS:', entry.changes.length);
            entry.changes.forEach((change, i) => {
                console.log(`    Change ${i + 1}:`);
                console.log('      - Field:', change.field);
                console.log('      - Item:', change.value?.item);
                console.log('      - Verb:', change.value?.verb);
            });
        }
    });
} else {
    console.log('❌ Not a page event. Object type:', body.object);
}

console.log('='.repeat(80));
