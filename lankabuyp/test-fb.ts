import { db } from './src/lib/firebase.ts';
import { collection, getDocs } from 'firebase/firestore';
async function test() {
  const q = collection(db, 'orders');
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} orders`);
}
test().catch(console.error);
