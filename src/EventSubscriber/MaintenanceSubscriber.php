<?php

namespace App\EventSubscriber;

use App\Domain\Helper\MaintenanceStateProvider;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Twig\Environment;

/**
 * Mode maintenance côté interface : quand il est actif, tout utilisateur NON super-admin voit la page
 * de maintenance (503) au lieu de l'application. Le super admin garde l'accès (pour piloter/désactiver),
 * et les routes d'authentification restent accessibles (sinon on ne pourrait ni se connecter ni couper
 * la maintenance). Le verrou dur reste l'API (cf. BK MaintenanceSubscriber).
 */
class MaintenanceSubscriber implements EventSubscriberInterface
{
    /** Routes toujours accessibles, même en maintenance. */
    private const WHITELIST = ['app_login', 'app_logout', 'forgot', 'reset'];

    public function __construct(
        private Security $security,
        private MaintenanceStateProvider $maintenance,
        private Environment $twig
    )
    {
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $route = $request->attributes->get('_route');

        // Assets / profiler / requêtes sans route : on laisse passer.
        if ($route === null || str_starts_with($route, '_')) {
            return;
        }
        if (in_array($route, self::WHITELIST, true)) {
            return;
        }

        // Non connecté : le firewall gère la redirection vers le login (whitelisté).
        $user = $this->security->getUser();
        if ($user === null) {
            return;
        }
        // Le super admin traverse la maintenance.
        if ($this->security->isGranted('ROLE_SUPER_ADMIN')) {
            return;
        }

        $etat = $this->maintenance->etat();
        if (!$etat['actif']) {
            return;
        }

        $html = $this->twig->render('maintenance.html.twig', ['message' => $etat['message']]);
        $event->setResponse(new Response($html, Response::HTTP_SERVICE_UNAVAILABLE));
    }

    public static function getSubscribedEvents(): array
    {
        // Priorité 7 : après le router (32) et le firewall (8) → route + utilisateur disponibles.
        return [KernelEvents::REQUEST => ['onKernelRequest', 7]];
    }
}
