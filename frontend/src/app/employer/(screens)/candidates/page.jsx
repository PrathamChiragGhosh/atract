import { Suspense } from "react";
import CommingSoonWrapper from '@/components/commingSoon/CommingSoonWrapper';
import './page.css';

export const dynamic = 'force-dynamic';

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CommingSoonWrapper />
        </Suspense>
    );
}