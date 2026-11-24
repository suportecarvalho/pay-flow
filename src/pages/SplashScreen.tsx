import { PayFlowLogo } from '../components/PayFlowLogo';

export function SplashScreen() {
  return (
    <div className="relative flex-1 w-full h-full bg-white flex items-center justify-center overflow-hidden">
      {/* Subtle large background scanner frame corners */}
      <div className="relative w-[240px] h-[340px] flex items-center justify-center">
        <span className="absolute top-0 left-0 w-10 h-10 border-t-[4px] border-l-[4px] border-[#F0F0F4]" />
        <span className="absolute top-0 right-0 w-10 h-10 border-t-[4px] border-r-[4px] border-[#F0F0F4]" />
        <span className="absolute bottom-0 left-0 w-10 h-10 border-b-[4px] border-l-[4px] border-[#F0F0F4]" />
        <span className="absolute bottom-0 right-0 w-10 h-10 border-b-[4px] border-r-[4px] border-[#F0F0F4]" />

        <PayFlowLogo size="lg" />
      </div>
    </div>
  );
}
