import PlanCar, { SiegePlan } from "./Billetterie/PlanCar"

interface Props {
    sieges: SiegePlan[]
    siegesGauche: number
    siegesDroite: number
}

export default function PlanCarReadonly({ sieges, siegesGauche, siegesDroite }: Props) {
    console.log("dd")
    return <>
        <PlanCar
            sieges={sieges}
            siegesGauche={siegesGauche}
            siegesDroite={siegesDroite}
            readonly={true}
        />
    </>
}