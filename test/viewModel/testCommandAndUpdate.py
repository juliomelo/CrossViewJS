from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import unittest, time, re, os

class CommandAndUpdateTest(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Firefox()
        self.driver.implicitly_wait(30)
        self.base_url = "http://change-this-to-the-site-you-are-testing/"
        self.verificationErrors = []
    
    def test_command_and_update(self):
        driver = self.driver
        driver.get("file:///" + os.path.dirname(os.getcwd() + "/" +  __file__) + "/commandAndUpdateTest.html")
        self.assertEqual("0 click.", driver.find_element_by_id("testView1").text)
        self.assertEqual("0 click.", driver.find_element_by_id("testView2").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("0 click.", driver.find_element_by_id("testView1").text)
        self.assertEqual("0 click.", driver.find_element_by_id("testView2").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("2 clicks.", driver.find_element_by_id("testView1").text)
        self.assertEqual("0 click.", driver.find_element_by_id("testView2").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("2", driver.find_element_by_css_selector("span.number").text)
        driver.find_element_by_css_selector("#test2 > button").click()
        self.assertEqual("0 click.", driver.find_element_by_id("testView2").text)
        self.assertEqual("2 clicks.", driver.find_element_by_id("testView1").text)
        driver.find_element_by_css_selector("#test2 > button").click()
        self.assertEqual("2 clicks.", driver.find_element_by_id("testView2").text)
        self.assertEqual("2 clicks.", driver.find_element_by_id("testView1").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("4 clicks.", driver.find_element_by_id("testView1").text)
        self.assertEqual("2 clicks.", driver.find_element_by_id("testView2").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("4 clicks.", driver.find_element_by_id("testView1").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("6 clicks.", driver.find_element_by_id("testView1").text)
        self.assertEqual("2 clicks.", driver.find_element_by_id("testView2").text)
        driver.find_element_by_css_selector("#test2 > button").click()
        self.assertEqual("2 clicks.", driver.find_element_by_id("testView2").text)
        driver.find_element_by_css_selector("#test2 > button").click()
        self.assertEqual("4 clicks.", driver.find_element_by_id("testView2").text)
        self.assertEqual("6 clicks.", driver.find_element_by_id("testView1").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("6 clicks.", driver.find_element_by_id("testView1").text)
        driver.find_element_by_css_selector("button").click()
        self.assertEqual("8 clicks.", driver.find_element_by_id("testView1").text)
    
    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException, e: return False
        return True
    
    def tearDown(self):
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

if __name__ == "__main__":
    unittest.main()
