import { db } from './src/lib/firebase.ts';
import { collection, getDocs } from 'firebase/firestore';

async function test() {
  const q = collection(db, 'orders');
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} orders`);
  snap.docs.forEach(d => console.log(d.id, d.data().status, d.data().paymentStatus, d.data().createdAt));
}
test().catch(console.error);
