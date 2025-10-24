<?php namespace Model\InstantSearch\Providers;

use Model\Router\AbstractRouterProvider;

class RouterProvider extends AbstractRouterProvider
{
	public static function getRoutes(): array
	{
		return [
			[
				'pattern' => 'instant-search',
				'controller' => 'InstantSearch',
			],
		];
	}
}
