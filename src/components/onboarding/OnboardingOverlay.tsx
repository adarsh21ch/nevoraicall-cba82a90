import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, SkipForward, Sparkles } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

/** Progress dots */
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <span className="text-xs text-muted-foreground font-medium mr-1">Step {current} of {total}</span>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-all ${
            i < current ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

export function OnboardingOverlay() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const {
    isActive,
    currentStep,
    loading,
    setupDemoData,
    goToStep,
    completeOnboarding,
    skipOnboarding,
    totalSteps,
  } = useOnboarding();

  const [showComplete, setShowComplete] = useState(false);

  // Step 2: Setup demo data when reaching step 2
  useEffect(() => {
    if (currentStep === 2 && isActive) {
      setupDemoData();
    }
  }, [currentStep, isActive, setupDemoData]);

  if (!isActive) return null;

  const firstName = profile?.display_name?.split(' ')[0] || 'there';

  // Step 1: Welcome Screen
  if (currentStep === 1) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full space-y-8">
          <div className="relative inline-block">
            <img
              src={nevoraLogo}
              alt="Nevorai"
              className="w-20 h-20 rounded-2xl shadow-xl mx-auto animate-pulse"
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold text-foreground font-heading">
              Welcome to Nevorai, {firstName}! 🎉
            </h1>
            <p className="text-muted-foreground text-[15px] font-body leading-relaxed">
              The smartest way to manage your network marketing prospects.
            </p>
            <p className="text-sm text-muted-foreground font-body">
              Let's set you up in 2 minutes.
            </p>
          </div>

          <ProgressBar current={1} total={totalSteps} />

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => goToStep(2)}
              className="w-full h-12 rounded-xl font-bold text-base"
            >
              Let's Go <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <button
              onClick={skipOnboarding}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Demo Sheet + Leads
  if (currentStep === 2) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6">
          <ProgressBar current={2} total={totalSteps} />

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-lg">
            <h2 className="text-lg font-bold text-foreground font-heading">Your Practice Leads</h2>
            <p className="text-sm text-muted-foreground font-body">
              We've added 3 demo leads to help you learn the app.
            </p>

            <div className="space-y-2">
              {['Rahul Sharma', 'Priya Mehta', 'Amit Gupta'].map((name, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {name[0]}
                    </div>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">DEMO</Badge>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-sm text-foreground font-body">
                👆 These are your practice leads. In real use, you'll import your own prospects here.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => goToStep(3)}
              className="w-full h-11 rounded-xl font-bold"
              disabled={loading}
            >
              Got it <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <button
              onClick={skipOnboarding}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto block"
            >
              <SkipForward className="h-3 w-3 inline mr-1" /> Skip Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Tag a Lead
  if (currentStep === 3) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6">
          <ProgressBar current={3} total={totalSteps} />

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-lg">
            <h2 className="text-lg font-bold text-foreground font-heading">Tag Your Leads</h2>
            <p className="text-sm text-muted-foreground font-body">
              Tags help you know exactly where each prospect is in your pipeline.
            </p>

            <div className="space-y-2">
              {[
                { label: '📞 Calling', color: 'bg-blue-500/15 text-blue-700' },
                { label: '📹 Video Send', color: 'bg-purple-500/15 text-purple-700' },
                { label: '🔥 Hot Lead', color: 'bg-red-500/15 text-red-700' },
                { label: '✅ Enrolled', color: 'bg-green-500/15 text-green-700' },
                { label: '🔄 Follow Up', color: 'bg-orange-500/15 text-orange-700' },
              ].map((tag) => (
                <div key={tag.label} className={`px-3 py-2 rounded-lg text-sm font-medium ${tag.color}`}>
                  {tag.label}
                </div>
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-sm text-foreground font-body">
                👆 You can assign these tags to any lead from their profile. Try it once you're inside the app!
              </p>
            </div>
          </div>

          <Button
            onClick={() => goToStep(4)}
            className="w-full h-11 rounded-xl font-bold"
          >
            Next Step <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Activity History
  if (currentStep === 4) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6">
          <ProgressBar current={4} total={totalSteps} />

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-lg">
            <h2 className="text-lg font-bold text-foreground font-heading">Activity History</h2>
            <p className="text-sm text-muted-foreground font-body">
              Every action you take is automatically logged. You'll always know what happened with every prospect.
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">🏷</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Tagged Rahul Sharma as "Calling"</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">📋</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Added 3 demo leads</p>
                  <p className="text-xs text-muted-foreground">2 min ago</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-sm text-foreground font-body">
                ✅ This is your Activity History. You'll find it in the Recent tab.
              </p>
            </div>
          </div>

          <Button
            onClick={() => goToStep(5)}
            className="w-full h-11 rounded-xl font-bold"
          >
            Next Step <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 5: Follow-Up + Completion
  if (currentStep === 5 && !showComplete) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6">
          <ProgressBar current={5} total={totalSteps} />

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-lg">
            <h2 className="text-lg font-bold text-foreground font-heading">Schedule Follow-Ups</h2>
            <p className="text-sm text-muted-foreground font-body">
              The most powerful feature — never forget to follow up with a prospect.
            </p>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs">📅</span>
              </div>
              <div>
                <p className="text-sm font-medium">Set a follow-up date on any lead</p>
                <p className="text-xs text-muted-foreground">Nevorai will remind you so you never forget</p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-sm text-foreground font-body">
                👆 Tap any lead → Schedule Follow-Up. Nevorai takes care of the rest.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowComplete(true)}
            className="w-full h-11 rounded-xl font-bold"
          >
            Finish Setup <Sparkles className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (showComplete) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full space-y-8">
          <div className="text-5xl">🎉</div>

          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold text-foreground font-heading">
              You're all set!
            </h1>
            <div className="space-y-2 text-left bg-card rounded-2xl border border-border p-5">
              {[
                'Manage your leads',
                'Tag prospects by stage',
                'Track your activity',
                'Schedule follow-ups',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              You're ready to import your real leads now!
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => {
                completeOnboarding();
                navigate('/dashboard');
              }}
              className="w-full h-12 rounded-xl font-bold text-base"
            >
              Import My Leads <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <button
              onClick={() => {
                completeOnboarding();
                navigate('/dashboard');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Explore App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
