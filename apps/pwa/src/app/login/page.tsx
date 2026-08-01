import LoginModal from "@/components/auth/auth.component.modal";

export default function LoginPage() {

    return (    
        <>
            <img alt='grid' src="/images/grid.svg" className='absolute left-0 top-0 h-full object-cover' />
            <LoginModal />
        </>
    );
}