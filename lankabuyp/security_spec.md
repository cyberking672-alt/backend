# Security Specification

## Data Invariants
1. Products catalog is readable by anyone, but writes require admin authentication.
2. Orders can be created during checkout or looked up by order reference.
3. System timestamps and immutable IDs must remain protected against modification.

## Rules Blueprint
- `products`: `allow read: if true; allow write: if false;` (admin/server managed)
- `orders`: `allow read, create: if true; allow update, delete: if false;` (server managed fulfillment)
