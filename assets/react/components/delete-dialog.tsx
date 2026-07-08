import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../components/ui/alert-dialog"

interface DeletePieceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    dataName?: string
}

export function DeleteDialog({ open, onOpenChange, onConfirm, dataName }: DeletePieceDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la pièce ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {dataName && (
                            <span>Vous êtes sur le point de supprimer <strong>{dataName}</strong>. </span>
                        )}
                        Cette action est irréversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        Supprimer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}