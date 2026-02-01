import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { AlertTriangle, Send } from "lucide-react"

export const ContestSubmitDialog = ({
    isOpen,
    onOpenChange,
    contestQuestions,
    submittedQuestions,
    handleSubmit,
}: {
    isOpen: boolean,
    onOpenChange: (val: boolean) => void,
    contestQuestions: number,
    submittedQuestions: number
    handleSubmit: () => void,
}) => {
    return <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-arena-warning/20">
                        <AlertTriangle className="h-5 w-5 text-arena-warning" />
                    </span>
                    Submit contest?
                </DialogTitle>
                <DialogDescription className="pt-1">
                    Are you sure you want to submit your answers? This will finalize your attempt and you
                    won&apos;t be able to change them. You&apos;ve submitted{" "}
                    <span className="font-semibold text-foreground">
                        {submittedQuestions} of {contestQuestions}
                    </span>{" "}
                    questions.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 ">
                <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="font-medium"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    className="arena-glow font-medium gap-2"
                >
                    <Send className="h-4 w-4" />
                    Yes, submit
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}