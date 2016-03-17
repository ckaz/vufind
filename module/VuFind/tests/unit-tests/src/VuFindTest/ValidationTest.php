<?php
/**
 * HTML5 Validation Test Class
 *
 * PHP version 5
 *
 * Copyright (C) Villanova University 2010.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * @category VuFind2
 * @package  Tests
 * @author   Chris Hallberg <crhallberg@gmail.com>
 * @license  http://opensource.org/licenses/gpl-2.0.php GNU General Public License
 * @link     http://vufind.org/wiki/vufind2:unit_tests Wiki
 */
namespace VuFindTest;
use Kevintweber\PhpunitMarkupValidators\Assert\AssertHTML5;

class HtmlTest extends Auth\ManagerTest
{
    /**
     * Get base URL of running VuFind instance.
     *
     * @param string $path Relative path to add to base URL.
     *
     * @return string
     */
    protected function validatePath($path = '', $message = null)
    {
        $base = getenv('VUFIND_URL');
        if (empty($base)) {
            $base = 'http://localhost/vufind';
        }
        $html = file_get_contents($base . $path);
        AssertHTML5::isValidMarkup($html, $message);
    }

    public function testHTMLValidation()
    {
        $this->validatePath('', 'Home page');
        $this->validatePath('/Search/Results?lookfor=test&type=AllFields', '"test" search');
        $this->validatePath('/Record/testdeweybrowse', 'Record page');
        $this->validatePath('/MyResearch/Home', 'Logged Out My Research');
        // Login?
        $user = $this->getMockUser();
        $request = $this->getMockRequest();
        $pm = $this->getMockPluginManager();
        $db = $pm->get('Database');
        $db->expects($this->once())->method('create')->with($request)->will($this->returnValue($user));
        $manager = $this->getManager([], null, null, $pm);
        $this->assertEquals($user, $manager->create($request));
        $this->assertEquals($user, $manager->isLoggedIn());
        // Logged in
        $this->validatePath('/MyResearch/Home', 'Logged In My Research');
    }
}